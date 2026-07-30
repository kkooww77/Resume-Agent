"""整份优化任务的进度模型（任务内、会话级，不跨会话）。

对应设计方案七点二：`_progress_by_session` 记录一次"整份优化"任务的确定性
进度。`pending` 由代码从简历结构确定性算出（哪些顶层模块有内容就进清单），
不问 LLM；模块推进用 LLM 输出的 `[[MODULE_DONE:模块名]]` 标记驱动，代码正则
识别；相变 `optimizing→reviewing` 由代码规则 `len(pending)==0` 触发，零 LLM 步数。

本模块只放纯函数/数据（模块清单、pending 计算、标记解析、清单渲染），
状态存取归 ResumeDataStore._progress_by_session（同 _data_by_session 类级字典模式）。

设计依据：knowledge-base/specs/2026-07-12-long-task-context-engineering-design.md 七点二~七点五。
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

from backend.agent.utils.coverage_check import extract_facts

# 整份优化覆盖的顶层模块，及其在 `# CV/Resume Context` 里的 `## ` 段标题前缀、
# 中文标签。顺序即优化推进顺序（education→experience→projects…）。
# header_prefix 用于把完整简历文本切成模块块，做"当前模块全文 + 其他模块仅标题"
# 的增量注入（见 prompt_builder），必须与 cv_reader_tool._format_full_resume 的
# `## ` 标题保持一致。
OPTIMIZE_MODULES: List[Tuple[str, str, str]] = [
    ("basic", "## Basic Information", "基本信息"),
    ("education", "## Education", "教育背景"),
    # 工作经历（全职）：独立板块，标题前缀刻意不含 "## Work Experience"，
    # 否则会和下面实习经历的切分前缀互相吞并
    ("workExperience", "## Full-time Experience", "工作经历"),
    ("experience", "## Work Experience", "实习经历"),
    ("projects", "## Projects", "项目经历"),
    ("openSource", "## Open Source", "开源经历"),
    ("skillContent", "## Skills", "专业技能"),
    ("selfEvaluation", "## Self Evaluation", "自我评价"),
    ("awards", "## Awards", "荣誉奖项"),
]

MODULE_HEADER: Dict[str, str] = {k: h for k, h, _ in OPTIMIZE_MODULES}
MODULE_LABEL: Dict[str, str] = {k: label for k, _, label in OPTIMIZE_MODULES}
_MODULE_ORDER = [k for k, _, _ in OPTIMIZE_MODULES]

# LLM 输出的模块推进标记：[[MODULE_DONE:experience]] 或 [[MODULE_DONE:experience:skip]]。
_MODULE_DONE_RE = re.compile(
    r"\[\[\s*MODULE_DONE\s*:\s*([A-Za-z]+)\s*(?::\s*(skip)\s*)?\]\]",
    re.IGNORECASE,
)

# 系统合成的整份优化续跑消息前缀（服务端 auto_continue 触发前端重新提交
# 下一轮时，构造的 user_input 应该以此开头）。独立 review 发现：任务
# alive（status!=done）期间，如果只凭"该会话有未完成任务"就无条件把
# 后续每一轮都当成"继续这个任务"处理，用户中途一句无关闲聊也会被增量
# 注入裁剪/强制脱敏/模块推进信号 3 误 skip。这个前缀让"任务是否该在本轮
# 生效"有一个明确、不依赖模糊猜测的判据：本轮是用户主动提整份优化措辞，
# 或是系统自己合成的续跑消息，两者之一才生效——不是"任务还没完就无脑
# 套用"。见 manus.py._maybe_init_optimize_progress / _advance_optimize_progress。
AUTO_CONTINUE_PREFIX = "[[AUTO_CONTINUE_OPTIMIZE]]"


def is_optimize_continuation_message(user_input: str) -> bool:
    """本轮是否是系统合成的整份优化续跑消息（区别于用户随口说的话）。"""
    return (user_input or "").strip().startswith(AUTO_CONTINUE_PREFIX)

# 模块名归一：接受 canonical key（大小写不敏感）+ 少量常见别名，兜住 LLM 措辞漂移。
_MODULE_ALIASES: Dict[str, str] = {}
for _k in _MODULE_ORDER:
    _MODULE_ALIASES[_k.lower()] = _k
_MODULE_ALIASES.update({
    "skills": "skillContent",
    "skill": "skillContent",
    "opensource": "openSource",
    "selfevaluation": "selfEvaluation",
    "summary": "selfEvaluation",
    "workexperience": "experience",
    "work": "experience",
    "project": "projects",
    "award": "awards",
})


def normalize_module_name(name: str) -> str | None:
    """把 LLM 给的模块名归一到 canonical key，识别不出返回 None。"""
    return _MODULE_ALIASES.get((name or "").strip().lower())


_MODULE_KEYS_SET = set(_MODULE_ORDER)


def resolve_module_from_path(path: str) -> str | None:
    """从 cv_editor_agent 的 path 参数（如 "education[0].description"/"basic.title"/
    "skillContent"）解析出对应的顶层模块 key，识别不出返回 None。

    用于进度推进的信号 2（真实工具调用推断）——实测 LLM 经常不遵循
    [[MODULE_DONE]] 这种自定义协议标记，不能只靠信号 1（见 manus.py
    ._advance_optimize_progress 的三层信号设计），需要从 LLM 真实调用的
    工具参数里直接推断"这一步碰了哪个模块"。
    """
    if not path:
        return None
    top = path.split(".")[0].split("[")[0]
    return top if top in _MODULE_KEYS_SET else None


def _module_has_content(resume_data: Dict[str, Any], key: str) -> bool:
    """某顶层模块是否有内容（列表非空 / 字符串非空 / basic 有 name 或 title）。"""
    value = resume_data.get(key)
    if key == "basic":
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, dict):
            return bool(str(value.get("name") or value.get("title") or "").strip())
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return bool(value)


def compute_pending_modules(resume_data: Dict[str, Any]) -> List[str]:
    """从简历结构确定性算出待优化模块清单。不问 LLM。

    ⚠️ 空模块**也要进 pending**——这样 agent 处理到它时有机会决定是问用户
    (调 ask_user_question)还是跳过,而不是假装这个模块不存在(用户实测:简历
    没教育经历,整份优化时 agent 直接从工作经历开干,全程不知道 education 存在,
    从不主动问)。唯一例外是 basic(姓名/电话/邮箱):这是红线,空了直接 skip,
    不该问也不进 pending。
    """
    if not isinstance(resume_data, dict):
        return []
    pending: List[str] = []
    for k in _MODULE_ORDER:
        # basic 空了不进 pending(姓名/电话/邮箱红线,空了直接跳过不问)
        if k == "basic" and not _module_has_content(resume_data, k):
            continue
        pending.append(k)
    return pending


def _module_text(resume_data: Dict[str, Any], key: str) -> str:
    """把某模块内容拼成纯文本，供 extract_facts 抽取关键实体。"""
    value = resume_data.get(key)
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    import json

    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


def build_module_facts(resume_data: Dict[str, Any], modules: List[str]) -> Dict[str, List[str]]:
    """任务初始化时一次性批量抽取各模块的关键实体（数字/专有名词），缓存复用。

    对应七点二的 `facts:{路径:槽位}`：给原文建可核对索引，用于审阅阶段的覆盖度
    核对提示，不替代原文。全程走规则匹配（extract_facts），不过 LLM、无额外成本。
    """
    facts: Dict[str, List[str]] = {}
    for key in modules:
        extracted = extract_facts(_module_text(resume_data, key))
        if extracted:
            facts[key] = extracted
    return facts


def verify_facts_coverage(
    progress: Dict[str, Any], resume_data: Dict[str, Any]
) -> Dict[str, List[str]]:
    """审阅收尾的确定性回验（Wave A-3/P1-1）：核对任务初始化时抽取的原文
    关键实体（facts）是否仍存在于当前简历文本中。纯字符串包含核对、零 LLM
    ——审阅 prompt 只是"要求"LLM 核对，这里是收尾时不靠自觉的代码验证。

    返回 {模块: [缺失实体]}；空 dict = 全部保留。注意实体可能是用户主动
    要求删除的，调用方的提示文案应是"请确认"而非断言错误。
    """
    if not progress or not resume_data:
        return {}
    # 跨模块迁移不算缺失(Codex A-3 review P1):用户/LLM 把项目里的事实挪进
    # 工作经历是合法编辑,只有全简历都找不到才报。
    # 全文用字符串叶子拼接而非 json.dumps(Codex 终轮 P2:JSON 会转义引号/
    # 反斜杠,含此类字符的 fact 迁移后会误报缺失)。每 fact 线性扫 O(F×N),
    # 简历规模(几 KB × 几十实体)下为微秒级,不为纸面复杂度换匹配语义。
    leaf_parts: List[str] = []

    def _collect_string_leaves(value: Any) -> None:
        if isinstance(value, str):
            leaf_parts.append(value)
        elif isinstance(value, dict):
            for v in value.values():
                _collect_string_leaves(v)
        elif isinstance(value, (list, tuple)):
            for v in value:
                _collect_string_leaves(v)
        elif value is not None:
            leaf_parts.append(str(value))

    _collect_string_leaves(resume_data)
    full_text = "\n".join(leaf_parts)
    missing: Dict[str, List[str]] = {}
    for module, items in (progress.get("facts") or {}).items():
        if not items:
            continue
        text = _module_text(resume_data, module)
        gone = [
            item
            for item in items
            if item not in (text or "") and item not in full_text
        ]
        if gone:
            missing[module] = gone
    return missing


def parse_module_done_markers(text: str) -> List[Tuple[str, bool]]:
    """从 LLM 输出里解析 [[MODULE_DONE:模块名(:skip)?]] 标记。

    返回 [(canonical_key, is_skip), ...]，识别不出的模块名丢弃。
    """
    if not text:
        return []
    out: List[Tuple[str, bool]] = []
    for raw_name, skip in _MODULE_DONE_RE.findall(text):
        key = normalize_module_name(raw_name)
        if key:
            out.append((key, bool(skip)))
    return out


def strip_module_done_markers(text: str) -> str:
    """从展示给用户的文本里剥掉 MODULE_DONE 标记（含其独占行的残留空行）。"""
    if not text:
        return text
    cleaned = _MODULE_DONE_RE.sub("", text)
    # 收掉标记独占一行后留下的空行
    cleaned = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", cleaned)
    return cleaned.strip()


def render_progress_checklist(progress: Dict[str, Any]) -> str:
    """把进度清单渲染成注入 system prompt 的确定性文本（不依赖 LLM 回忆）。"""
    pending: List[str] = list(progress.get("pending") or [])
    done: List[str] = list(progress.get("done") or [])
    status = progress.get("status")

    def _labels(keys: List[str]) -> str:
        return "、".join(f"{MODULE_LABEL.get(k, k)}({k})" for k in keys) or "无"

    lines = ["## 整份优化进度（系统按简历结构确定性维护，请勿自行编造或改写此清单）"]
    lines.append(f"- 已完成：{_labels(done)}")
    lines.append(f"- 待优化：{_labels(pending)}")
    if pending:
        current = pending[0]
        lines.append(
            f"- **当前模块：{MODULE_LABEL.get(current, current)}({current})**"
            " ← 本轮只优化这一个模块，其他模块本轮不要动"
        )
        lines.append("")
        lines.append(
            "处理完当前模块后，在回复的最后单独一行输出标记推进进度："
            f"`[[MODULE_DONE:{current}]]`（已优化完成）"
            f"或 `[[MODULE_DONE:{current}:skip]]`（判断该模块无需修改）。"
        )
        lines.append(
            "一次只推进一个模块；标记里的模块名必须用上面括号里的英文 key，逐字照抄。"
        )
        lines.append(
            "如果上方「# CV/Resume Context」里找不到这个模块对应的 `## ` 章节标题——"
            "说明用户本来就没填这块内容，不是系统没加载出来、更不是权限/规则不让你看。"
            "教育经历/实习经历/项目经历等模块内容始终正常读取、正常注入上下文，"
            "没有任何模块被禁止查看或处理。遇到内容为空，不要说"
            "「系统显示还未加载完整信息」这类暗示故障的话。"
        )
        lines.append(
            "⚠️ 内容为空时**不要无脑跳过**——先判断这个模块缺的字段是不是用户大概率"
            "有、补上能明显加分的（GPA、时间、奖项、院校名、课程等）。如果是，"
            "**调用 `ask_user_question` 工具**逐项问用户（选择框形式，用户点选即可），"
            "拿到答案再改写模块；只有姓名/电话/邮箱这类个人信息为空才直接 "
            f"`[[MODULE_DONE:{current}:skip]]` 跳过。详见系统提示词「补全模块信息」一节。"
        )
    elif status == "reviewing":
        lines.append("")
        lines.append(
            "- **本轮为整份优化的最终一致性审阅**（全部模块已处理完成，本轮独占一次完整预算）："
            "通读全篇已改写内容，检查①前后模块措辞是否雷同、风格是否统一"
            "②是否有原文中的数字/专有名词/关键事实被误删或改写走样"
            "③是否有内容与原文事实矛盾。发现问题直接调用编辑工具修正，无需再输出模块推进标记。"
        )
        # Wave A-3(P1-1):把任务初始化时抽取的原文关键实体索引(facts,此前
        # 全仓零消费的死数据)接进审阅 prompt——审阅不再靠 LLM 凭记忆回想
        # "原文有什么",而是逐项核对下面的清单。
        # 渲染限流(Codex A-3 review P2):长简历实体可能很多,prompt 侧有界,
        # 截断的部分仍由收尾代码回验全量核对(verify_facts_coverage 不截断)。
        _PER_MODULE_CAP = 12
        _TOTAL_CAP = 60
        # 字符预算(Codex 终轮 P2:条数上限拦不住单项超长 token 撑爆 prompt);
        # 超预算/超长单项不渲染,计入"其余 N 项",仍由收尾代码全量核验
        _ITEM_CHAR_CAP = 80
        _TOTAL_CHAR_BUDGET = 2000
        facts = progress.get("facts") or {}
        fact_lines: List[str] = []
        total_rendered = 0
        rendered_chars = 0
        total_items = sum(len(v) for v in facts.values())
        for module, items in facts.items():
            if not items or total_rendered >= _TOTAL_CAP:
                continue
            take: List[str] = []
            for item in items:
                if len(take) >= _PER_MODULE_CAP or total_rendered >= _TOTAL_CAP:
                    break
                if len(item) > _ITEM_CHAR_CAP:
                    continue
                if rendered_chars + len(item) > _TOTAL_CHAR_BUDGET:
                    break
                take.append(item)
                total_rendered += 1
                rendered_chars += len(item)
            if take:
                fact_lines.append(
                    f"  - {MODULE_LABEL.get(module, module)}: {'、'.join(take)}"
                )
        if fact_lines:
            lines.append(
                "- **原文关键实体核对清单**（任务开始时从原文提取）：逐项确认仍存在于"
                "当前简历中。**先判断**：若是用户明确要求删除的内容、或已被合理"
                "迁移到其他模块，就不要补回；只有确属优化时误删的，才用编辑工具补回。"
            )
            lines.extend(fact_lines)
            if total_items > total_rendered:
                lines.append(
                    f"  - （其余 {total_items - total_rendered} 项未在此列出，"
                    f"收尾时系统会代码级全量核验）"
                )
    return "\n".join(lines)


def slice_resume_context_for_module(full_text: str, current_module: str) -> str:
    """增量注入：当前模块给完整原文，其他模块本轮"延后发送"（只给标题）。

    硬约束（设计方案三点五）：轮到的模块必须是完整原文，不做摘要/压缩替代；
    没轮到的模块是"延后发送"，不是"压缩后发送"——本函数对当前模块的正文
    一个字都不动，只砍掉其他模块的正文，换成一行提示。

    解析不出 `## ` 模块边界（说明 full_text 跟 cv_reader_tool._format_full_resume
    的标题约定不一致，比如上游格式变了）时保守返回完整原文，不冒险误删内容。

    **独立 review round5 发现并修复的真实 bug**：原来只在"完全没有 `## ` 标题"
    时才回退全文；但如果标题都在、唯独 `current_module` 对应的标题缺失
    （比如该模块任务开始后被整个删空/清成 delete，或简历被换了一份结构不同
    的），就会出现"每个识别到的模块都不是 current_module"，导致全部模块的
    正文被换成"延后发送"占位——LLM 拿到一份正文全空的简历。改成先扫一遍
    实际出现过的模块 key，`current_module` 不在其中时同样保守回退全文，
    不冒险把当前该处理的模块也一起砍掉。
    """
    if not full_text or not current_module:
        return full_text

    lines = full_text.split("\n")
    header_idxs = [i for i, ln in enumerate(lines) if ln.startswith("## ")]
    if not header_idxs:
        return full_text

    def _match_key(header_line: str) -> str | None:
        return next(
            (k for k, prefix in MODULE_HEADER.items() if header_line.startswith(prefix)),
            None,
        )

    matched_keys = {_match_key(lines[start]) for start in header_idxs}
    if current_module not in matched_keys:
        return full_text

    out: List[str] = list(lines[: header_idxs[0]])
    for pos, start in enumerate(header_idxs):
        end = header_idxs[pos + 1] if pos + 1 < len(header_idxs) else len(lines)
        header_line = lines[start]
        key = _match_key(header_line)
        if key is None or key == current_module:
            # 识别不出模块归属，或就是当前模块：原样保留全部正文
            out.extend(lines[start:end])
        else:
            out.append(header_line)
            out.append(
                "（本轮暂不处理，内容延后发送——不代表已删除，处理到该模块时会给出完整原文）"
            )
            out.append("")
    return "\n".join(out)
