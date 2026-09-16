"""
LLM 调用封装
统一入口，基于 simple.py 封装 LLM 调用
"""
import os
import sys
from pathlib import Path
from fastapi import HTTPException

# 将当前目录和项目根目录加入 sys.path
CURRENT_DIR = Path(__file__).resolve().parent  # backend/
ROOT = CURRENT_DIR.parent  # 项目根目录

for p in [CURRENT_DIR, ROOT]:
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

# 导入 simple 模块（优先从 backend 目录导入）
try:
    from backend import simple
except ImportError:
    try:
        import simple
    except ImportError as e:
        # 最后尝试直接导入文件
        simple_path = CURRENT_DIR / "simple.py"
        if not simple_path.exists():
            simple_path = ROOT / "simple.py"
        if simple_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("simple", simple_path)
            simple = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(simple)
        else:
            raise RuntimeError(f"无法导入 simple.py: {e}")

# 全局 AI 配置
DEFAULT_AI_PROVIDER = "deepseek"
DEFAULT_AI_MODEL = {
    "deepseek": "deepseek-flash"
}

# 支持的模型列表（2026-09-16 起为 DeepSeek 官方在售型号，
# 官方 /models 只返回 deepseek-flash 与 deepseek-v4-pro）
SUPPORTED_MODELS = {
    "deepseek-flash": "DeepSeek Flash (快速)",
    "deepseek-v4-pro": "DeepSeek V4 Pro"
}


def call_llm(provider: str, prompt: str, return_usage: bool = False, model: str = None):
    """
    统一入口，基于 simple.py 封装 LLM 调用
    在调用前检查必要的 API Key，缺失时返回 400 级错误

    参数:
        provider: AI 提供商 ("deepseek")
        prompt: 提示词
        return_usage: 是否返回 token 使用信息，默认 False（向后兼容）
        model: 可选，指定具体模型（如 "deepseek-v3.2" 或 "deepseek-reasoner"）

    返回:
        如果 return_usage=False: 返回字符串（内容）
        如果 return_usage=True: 返回字典 {"content": str, "usage": dict}
    """
    if provider == "deepseek":
        key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
               or getattr(simple, "DEEPSEEK_API_KEY", ""))
        if not key:
            raise HTTPException(
                status_code=400,
                detail="缺少 DEEPSEEK_API_KEY，请在项目根目录 .env 或系统环境中配置 DEEPSEEK_API_KEY"
            )
        simple.DEEPSEEK_API_KEY = key
        # 如果指定了模型，使用指定的模型，否则使用环境变量或默认值
        if model:
            # 归一已下线型号（老前端缓存会发旧名），避免原样透传上游 404
            simple.DEEPSEEK_MODEL = simple.normalize_model_name(model)
        else:
            simple.DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", simple.DEEPSEEK_MODEL)
        simple.DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", simple.DEEPSEEK_BASE_URL)
        return simple.call_deepseek_api(prompt, model=simple.DEEPSEEK_MODEL)

    else:
        raise ValueError(f"不支持的 provider: {provider}")


def call_llm_stream(provider: str, prompt: str):
    """
    流式调用 LLM，返回生成器
    """
    if provider == "deepseek":
        key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
               or getattr(simple, "DEEPSEEK_API_KEY", ""))
        if not key:
            raise HTTPException(
                status_code=400,
                detail="缺少 DEEPSEEK_API_KEY"
            )
        simple.DEEPSEEK_API_KEY = key
        simple.DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", simple.DEEPSEEK_MODEL)
        simple.DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", simple.DEEPSEEK_BASE_URL)

        for chunk in simple.call_deepseek_api_stream(prompt):
            yield chunk

    else:
        raise ValueError(f"不支持的 provider: {provider}")


def get_ai_config():
    """获取当前 AI 配置"""
    return {
        "defaultProvider": DEFAULT_AI_PROVIDER,
        "defaultModel": DEFAULT_AI_MODEL.get(DEFAULT_AI_PROVIDER, ""),
        "models": DEFAULT_AI_MODEL,
        "supportedModels": SUPPORTED_MODELS
    }
