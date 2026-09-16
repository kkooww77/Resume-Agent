"""
配置管理路由
"""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# 统一优先使用顶层模块，避免 models 被重复加载为两个模块名
try:
    from models import SaveKeysRequest, AITestRequest, ChatRequest
    from llm import call_llm, get_ai_config
    from middleware.auth import require_admin_only
    from prompt_templates import (
        get_prompt_templates,
        save_prompt_templates,
        get_prompt_registry,
    )
except ImportError:  # fallback
    from backend.models import SaveKeysRequest, AITestRequest, ChatRequest
    from backend.llm import call_llm, get_ai_config
    from backend.middleware.auth import require_admin_only
    from backend.prompt_templates import (
        get_prompt_templates,
        save_prompt_templates,
        get_prompt_registry,
    )

router = APIRouter(prefix="/api", tags=["Config"])

ROOT_DIR = Path(__file__).resolve().parents[2]


class SavePromptsRequest(BaseModel):
    prompts: dict[str, str] | None = None
    rewrite_text_prompt_template: str | None = None  # backward compatible
    rewrite_default_instruction: str | None = None  # backward compatible


@router.get("/ai/config")
async def get_ai_config_endpoint():
    """获取当前 AI 配置"""
    return get_ai_config()


@router.get("/config/keys")
async def get_keys_status(_current_user=Depends(require_admin_only)):
    """获取 API Key 配置状态（不返回完整 Key，只返回是否已配置）；仅管理员"""
    # 直接从 .env 文件读取，不依赖环境变量
    env_path = ROOT_DIR / ".env"
    zhipu_key = ""
    doubao_key = ""
    deepseek_key = ""
    
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, value = line.split("=", 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key == "ZHIPU_API_KEY":
                            zhipu_key = value
                        elif key == "DOUBAO_API_KEY":
                            doubao_key = value
                        elif key == "DASHSCOPE_API_KEY":
                            deepseek_key = value
        except Exception:
            # 如果读取失败，回退到环境变量
            zhipu_key = os.getenv("ZHIPU_API_KEY", "")
            doubao_key = os.getenv("DOUBAO_API_KEY", "")
            deepseek_key = os.getenv("DASHSCOPE_API_KEY", "")
    else:
        # 如果 .env 不存在，回退到环境变量
        zhipu_key = os.getenv("ZHIPU_API_KEY", "")
        doubao_key = os.getenv("DOUBAO_API_KEY", "")
        deepseek_key = os.getenv("DASHSCOPE_API_KEY", "")

    return {
        "zhipu": {
            "configured": bool(zhipu_key and len(zhipu_key) > 10),
            "preview": f"{zhipu_key[:8]}..." if zhipu_key and len(zhipu_key) > 10 else ""
        },
        "doubao": {
            "configured": bool(doubao_key and len(doubao_key) > 10),
            "preview": f"{doubao_key[:8]}..." if doubao_key and len(doubao_key) > 10 else ""
        },
        "deepseek": {
            "configured": bool(deepseek_key and len(deepseek_key) > 10),
            "preview": f"{deepseek_key[:8]}..." if deepseek_key and len(deepseek_key) > 10 else ""
        }
    }


_ENV_KEY_BY_PROVIDER = {
    "zhipu": "ZHIPU_API_KEY",
    "doubao": "DOUBAO_API_KEY",
    "deepseek": "DASHSCOPE_API_KEY",
}


def _blank_env_keys(env_keys: list[str]) -> None:
    """把指定 env key 的值清空(保留行),并同步进程环境"""
    env_path = ROOT_DIR / ".env"
    lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    with open(env_path, "w", encoding="utf-8") as f:
        for line in lines:
            key = line.split("=", 1)[0].strip() if "=" in line else ""
            f.writelines([f"{key}=\n"] if key in env_keys else [line])
    for key in env_keys:
        os.environ[key] = ""


@router.delete("/config/keys/{provider}")
async def delete_key(provider: str, _current_user=Depends(require_admin_only)):
    """删除单个 Provider 的 API Key(清空 .env 中的值);仅管理员"""
    env_key = _ENV_KEY_BY_PROVIDER.get(provider)
    if not env_key:
        raise HTTPException(status_code=404, detail=f"未知 provider: {provider}")
    _blank_env_keys([env_key])
    return {"success": True, "message": f"{provider} 的 API Key 已删除"}


@router.delete("/config/keys")
async def clear_keys(_current_user=Depends(require_admin_only)):
    """清除全部已存储的 API Key(危险区域);仅管理员"""
    _blank_env_keys(list(_ENV_KEY_BY_PROVIDER.values()))
    return {"success": True, "message": "全部 API Key 已清除"}


@router.get("/config/stats")
async def get_config_stats(_current_user=Depends(require_admin_only)):
    """系统状态统计(设置页状态卡):数据库连通、简历数、用户数、DeepSeek base_url;仅管理员"""
    try:
        from database import SessionLocal
    except ImportError:
        from backend.database import SessionLocal
    from sqlalchemy import text as sql_text

    db_ok = True
    resumes = 0
    users = 0
    try:
        db = SessionLocal()
        try:
            resumes = db.execute(sql_text("SELECT count(*) FROM resumes")).scalar() or 0
            users = db.execute(sql_text('SELECT count(*) FROM "user"')).scalar() or 0
        finally:
            db.close()
    except Exception:
        db_ok = False

    try:
        from backend import simple
    except ImportError:
        import simple
    base_url = getattr(simple, "DEEPSEEK_BASE_URL", "")

    return {"db_ok": db_ok, "resumes": resumes, "users": users, "deepseek_base_url": base_url}


@router.post("/config/keys")
async def save_keys(body: SaveKeysRequest, _current_user=Depends(require_admin_only)):
    """保存 API Key 到 .env 文件；仅管理员（Key 写入服务器全局配置）"""
    try:
        env_path = ROOT_DIR / ".env"

        existing_lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                existing_lines = f.readlines()

        new_lines = []
        zhipu_found = False
        doubao_found = False
        deepseek_found = False

        for line in existing_lines:
            if line.startswith("ZHIPU_API_KEY=") and body.zhipu_key:
                new_lines.append(f"ZHIPU_API_KEY={body.zhipu_key}\n")
                zhipu_found = True
            elif line.startswith("DOUBAO_API_KEY=") and body.doubao_key:
                new_lines.append(f"DOUBAO_API_KEY={body.doubao_key}\n")
                doubao_found = True
            elif line.startswith("DASHSCOPE_API_KEY=") and body.deepseek_key:
                new_lines.append(f"DASHSCOPE_API_KEY={body.deepseek_key}\n")
                deepseek_found = True
            else:
                new_lines.append(line)

        if body.zhipu_key and not zhipu_found:
            new_lines.append(f"ZHIPU_API_KEY={body.zhipu_key}\n")
        if body.doubao_key and not doubao_found:
            new_lines.append(f"DOUBAO_API_KEY={body.doubao_key}\n")
        if body.deepseek_key and not deepseek_found:
            new_lines.append(f"DASHSCOPE_API_KEY={body.deepseek_key}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        if load_dotenv:
            load_dotenv(dotenv_path=str(env_path), override=True)

        # 更新 DeepSeek API Key
        if body.deepseek_key:
            try:
                try:
                    from backend import simple
                except ImportError:
                    import simple
                simple.DEEPSEEK_API_KEY = body.deepseek_key
            except Exception as e:
                print(f"[警告] 更新 DeepSeek API Key 失败: {e}")

        return {"success": True, "message": "API Key 已保存"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@router.get("/config/prompts")
async def get_prompts(_current_user=Depends(require_admin_only)):
    """获取提示词模板配置（后台管理）"""
    return {
        "items": get_prompt_registry(),
        "templates": get_prompt_templates(),
    }


@router.put("/config/prompts")
async def save_prompts(body: SavePromptsRequest, _current_user=Depends(require_admin_only)):
    """保存提示词模板配置（后台管理）"""
    updates: dict[str, str] = {}
    if body.prompts:
        updates.update(body.prompts)
    if body.rewrite_text_prompt_template:
        updates["rewrite_text_prompt_template"] = body.rewrite_text_prompt_template
    if body.rewrite_default_instruction:
        updates["rewrite_default_instruction"] = body.rewrite_default_instruction

    updated = save_prompt_templates(updates)
    return {"success": True, "prompts": updated}


@router.get("/ai/test-keys")
async def test_ai_keys():
    """检测各 API Key 是否可用：对已配置的 Key 分别发起一次最小调用"""
    env_path = ROOT_DIR / ".env"
    zhipu_key = ""
    doubao_key = ""
    deepseek_key = ""
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, value = line.split("=", 1)
                    key, value = key.strip(), value.strip().strip('"').strip("'")
                    if key == "ZHIPU_API_KEY":
                        zhipu_key = value
                    elif key == "DOUBAO_API_KEY":
                        doubao_key = value
                    elif key == "DASHSCOPE_API_KEY":
                        deepseek_key = value
        except Exception:
            zhipu_key = os.getenv("ZHIPU_API_KEY", "")
            doubao_key = os.getenv("DOUBAO_API_KEY", "")
            deepseek_key = os.getenv("DASHSCOPE_API_KEY", "")
    else:
        zhipu_key = os.getenv("ZHIPU_API_KEY", "")
        doubao_key = os.getenv("DOUBAO_API_KEY", "")
        deepseek_key = os.getenv("DASHSCOPE_API_KEY", "")

    configured = {
        "zhipu": bool(zhipu_key and len(zhipu_key) > 10),
        "doubao": bool(doubao_key and len(doubao_key) > 10),
        "deepseek": bool(deepseek_key and len(deepseek_key) > 10),
    }
    result = {}
    for provider in ["zhipu", "doubao", "deepseek"]:
        if not configured[provider]:
            result[provider] = {"configured": False}
            continue
        try:
            call_llm(provider, "你好", return_usage=False)
            result[provider] = {"configured": True, "ok": True}
        except HTTPException as he:
            result[provider] = {
                "configured": True,
                "ok": False,
                "error": str(he.detail) if he.detail else f"HTTP {he.status_code}",
            }
        except Exception as e:
            result[provider] = {"configured": True, "ok": False, "error": str(e)}
    return result


@router.post("/ai/test")
async def ai_test(body: AITestRequest):
    """测试已有 AI 接口是否可用"""
    try:
        result = call_llm(body.provider, body.prompt, return_usage=True)
        if isinstance(result, dict):
            return {
                "provider": body.provider,
                "result": result.get("content", ""),
                "usage": result.get("usage", {})
            }
        else:
            # 向后兼容
            return {"provider": body.provider, "result": result, "usage": {}}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 测试失败: {e}")


@router.post("/chat")
async def chat_api(body: ChatRequest):
    """通用聊天接口，用于AI改写等功能"""
    try:
        prompt_parts = []
        for msg in body.messages:
            if msg.role == "system":
                prompt_parts.append(f"系统指令：{msg.content}")
            elif msg.role == "user":
                prompt_parts.append(f"用户：{msg.content}")
            elif msg.role == "assistant":
                prompt_parts.append(f"助手：{msg.content}")

        prompt = "\n\n".join(prompt_parts) + "\n\n请回复："

        provider = body.provider
        if not provider:
            # 默认使用 deepseek
            if os.getenv("DASHSCOPE_API_KEY"):
                provider = "deepseek"
            elif os.getenv("ZHIPU_API_KEY"):
                provider = "zhipu"
            elif os.getenv("DOUBAO_API_KEY"):
                provider = "doubao"
            else:
                raise HTTPException(status_code=400, detail="未配置 AI 服务 API Key，请在环境变量中配置 DASHSCOPE_API_KEY")

        result = call_llm(provider, prompt)
        return {"content": result, "provider": provider}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 请求失败: {e}")
