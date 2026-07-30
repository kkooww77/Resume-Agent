"""生成可直接渲染的简历诊断卡数据。

这是诊断的稳定结构层：只输出评分、问题类别和下一步动作，不把联系方式或
模型内部推理暴露给前端。后续可以替换评分算法，前端协议保持不变。
"""

from __future__ import annotations

import re
from html import unescape
from typing import Any, Dict, Iterable, List, Mapping


_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")
_NUMBER_EVIDENCE_RE = re.compile(
    r"(?:\d+(?:\.\d+)?\s*(?:%|倍|万|千|余|\+|ms|s|秒|分钟|小时|天|个|条|次|人|元|w|k))"
    r"|(?:QPS|TPS|DAU|MAU|GMV|PV|UV)",
    re.IGNORECASE,
)
_SKILL_SPLIT_RE = re.compile(r"[、,，;/；|\n]+")
_LATIN_SKILL_RE = re.compile(r"[A-Za-z][A-Za-z0-9.+#-]{1,24}")
_DIRECTION_KEYWORDS = (
    "后端",
    "前端",
    "全栈",
    "算法",
    "数据",
    "测试",
    "产品",
    "运营",
    "设计",
    "Java",
    "Go",
    "Python",
    "React",
)


def _plain_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return _SPACE_RE.sub(" ", unescape(_TAG_RE.sub(" ", value))).strip()
    if isinstance(value, Mapping):
        return " ".join(_plain_text(item) for item in value.values()).strip()
    if isinstance(value, Iterable) and not isinstance(value, (bytes, bytearray)):
        return " ".join(_plain_text(item) for item in value).strip()
    return str(value).strip()


def _entries(resume: Mapping[str, Any], *keys: str) -> List[Mapping[str, Any]]:
    """取首个命中的 key（多个 key 为同一份数据的别名，如 openSource/open_source）。

    注意语义是「别名二选一」而非合并——需要跨板块合并时在调用点用 `+` 显式拼，
    见 workExperience（工作）与 experience（实习）的用法。
    """
    for key in keys:
        value = resume.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, Mapping)]
    return []


def _has_content(entries: List[Mapping[str, Any]]) -> bool:
    return any(len(_plain_text(entry)) >= 4 for entry in entries)


def _entry_description(entry: Mapping[str, Any]) -> str:
    return _plain_text(
        entry.get("details")
        or entry.get("description")
        or entry.get("highlights")
        or entry.get("items")
        or ""
    )


def _has_date(entry: Mapping[str, Any]) -> bool:
    return bool(
        _plain_text(
            entry.get("date")
            or entry.get("dateRange")
            or entry.get("startDate")
            or entry.get("start_date")
            or entry.get("endDate")
            or entry.get("end_date")
        )
    )


def _clamp_score(value: float) -> int:
    return max(0, min(100, round(value)))


def _resume_meta(resume: Mapping[str, Any]) -> Dict[str, str]:
    basic = resume.get("basic") or resume.get("basics") or {}
    if not isinstance(basic, Mapping):
        basic = {}
    meta = resume.get("_meta") or {}
    if not isinstance(meta, Mapping):
        meta = {}
    return {
        "id": str(
            resume.get("resume_id")
            or resume.get("id")
            or meta.get("resume_id")
            or ""
        ),
        "name": str(
            meta.get("name")
            or resume.get("title")
            or basic.get("name")
            or "当前简历"
        ),
        "updated_at": str(
            resume.get("updatedAt")
            or resume.get("updated_at")
            or meta.get("updated_at")
            or ""
        ),
        "language": str(resume.get("language") or "中文"),
    }


def _dimension(
    score: int,
    strong: str,
    medium: str,
    weak: str,
    action_label: str,
    action_message: str,
) -> Dict[str, Any]:
    description = strong if score >= 82 else medium if score >= 68 else weak
    return {
        "score": score,
        "description": description,
        "action_label": action_label,
        "action_message": action_message,
    }


def build_resume_diagnosis(resume_data: Mapping[str, Any]) -> Dict[str, Any]:
    """基于当前简历事实生成稳定的 UP 风格诊断协议。"""

    resume = resume_data if isinstance(resume_data, Mapping) else {}
    basic = resume.get("basic") or resume.get("basics") or {}
    if not isinstance(basic, Mapping):
        basic = {}

    education = _entries(resume, "education")
    # 工作经历与实习经历是两个独立板块，诊断按「全部经历」合并统计
    # （原写法把三者当别名二选一，workExperience 永远读不到 → 整段漏诊断）
    experience = _entries(resume, "workExperience") + _entries(
        resume, "experience", "internships"
    )
    projects = _entries(resume, "projects")
    open_source = _entries(resume, "openSource", "open_source")
    awards = _entries(resume, "awards")
    evidence_entries = experience + projects + open_source

    has_education = _has_content(education)
    has_experience = _has_content(experience)
    has_projects = _has_content(projects) or _has_content(open_source)
    target = _plain_text(basic.get("title") or resume.get("objective") or "")
    summary_text = _plain_text(
        resume.get("selfEvaluation")
        or resume.get("summary")
        or basic.get("summary")
        or ""
    )
    skills_text = _plain_text(resume.get("skillContent") or resume.get("skills") or "")
    skill_count = len([item for item in _SKILL_SPLIT_RE.split(skills_text) if item.strip()])

    descriptions = [_entry_description(entry) for entry in evidence_entries]
    descriptions = [text for text in descriptions if text]
    quantified_count = sum(bool(_NUMBER_EVIDENCE_RE.search(text)) for text in descriptions)
    detailed_count = sum(len(text) >= 80 for text in descriptions)
    evidence_total = max(1, len(descriptions))
    quantified_ratio = quantified_count / evidence_total
    detailed_ratio = detailed_count / evidence_total
    evidence_text = " ".join(
        descriptions
        + [
            _plain_text(
                entry.get("position")
                or entry.get("subtitle")
                or entry.get("role")
                or ""
            )
            for entry in evidence_entries
        ]
    ).lower()
    skill_tokens = {
        token.lower()
        for token in _LATIN_SKILL_RE.findall(skills_text)
        if token.lower() not in {"and", "with", "html", "strong", "class", "custom-list"}
    }
    evidenced_skills = {token for token in skill_tokens if token in evidence_text}
    skill_evidence_ratio = (
        len(evidenced_skills) / len(skill_tokens) if skill_tokens else 0
    )
    target_keywords = {
        keyword.lower()
        for keyword in _DIRECTION_KEYWORDS
        if keyword.lower() in target.lower()
    }
    direction_alignment = bool(
        target_keywords
        and any(keyword in f"{evidence_text} {skills_text.lower()}" for keyword in target_keywords)
    )

    dated_entries = education + evidence_entries
    date_ratio = (
        sum(_has_date(entry) for entry in dated_entries) / len(dated_entries)
        if dated_entries
        else 0
    )

    content_score = 42
    content_score += 8 if has_education else 0
    content_score += 12 if has_experience else 0
    content_score += 7 if has_projects else 0
    content_score += 7 if skill_count >= 3 else 3 if skill_count else 0
    content_score += 4 if summary_text else 0
    content_score += 5 * date_ratio
    content_score += 8 * detailed_ratio
    content_score = _clamp_score(content_score)

    interview_score = 35
    interview_score += 10 if has_experience else 0
    interview_score += 7 if has_projects else 0
    interview_score += 20 * quantified_ratio
    interview_score += 12 * detailed_ratio
    interview_score += 4 if has_education else 0
    interview_score = _clamp_score(interview_score)

    matching_score = 35
    matching_score += 18 if target else 0
    matching_score += 8 if skill_count >= 3 else 3 if skill_count else 0
    matching_score += 12 * skill_evidence_ratio
    matching_score += 7 if direction_alignment else 0
    matching_score += 6 if has_experience else 0
    matching_score += 4 if has_projects else 0
    matching_score = _clamp_score(matching_score)

    overall_score = _clamp_score(
        content_score * 0.4 + interview_score * 0.3 + matching_score * 0.3
    )
    screening_score = _clamp_score(
        content_score * 0.45 + interview_score * 0.35 + matching_score * 0.2
    )

    must_fix: List[str] = []
    should_fix: List[str] = []
    optional: List[str] = []
    strengths: List[str] = []

    if not has_education:
        must_fix.append("教育经历为空，招聘方无法确认学历、专业与毕业时间。")
    else:
        strengths.append("教育背景已形成基础信息，可继续强化与目标岗位相关的课程或荣誉。")
        education_missing_school = any(
            not _plain_text(entry.get("school") or entry.get("title"))
            for entry in education
        )
        education_missing_date = any(not _has_date(entry) for entry in education)
        has_gpa_or_rank = any(
            _plain_text(entry.get("gpa") or entry.get("rank"))
            for entry in education
        )
        if education_missing_school:
            must_fix.append("教育经历缺少院校名称，基础背景无法被招聘方核验。")
        if education_missing_date:
            should_fix.append("教育经历缺少完整时间范围，毕业时间与求职阶段不清晰。")
        if not has_gpa_or_rank:
            optional.append("教育经历未提供 GPA 或专业排名；成绩有优势时可补充，没有可不写。")

    if not has_experience:
        must_fix.append("工作或实习经历为空，当前缺少最关键的岗位胜任证据。")
    elif quantified_ratio >= 0.5:
        strengths.append("经历中已有量化结果，能够较快建立成果可信度。")
    else:
        should_fix.append("经历以职责描述为主，量化结果和业务影响证据不足。")

    if not has_projects:
        should_fix.append("项目经历偏弱或为空，技术能力缺少可验证的应用场景。")
    elif detailed_ratio < 0.5:
        should_fix.append("项目描述较短，建议补足问题、关键动作和最终结果。")
    else:
        strengths.append("项目或开源经历有一定细节，能够支撑能力判断。")

    if not target:
        should_fix.append("目标岗位未明确，关键词取舍和匹配度判断缺少基准。")
    if skill_count < 3:
        should_fix.append("技能信息过少，尚未形成与经历互相印证的能力地图。")
    elif skill_tokens and skill_evidence_ratio < 0.35:
        should_fix.append(
            "技能栏中的多数技术词没有在经历或项目中出现，面试时容易被追问实际使用深度。"
        )
    elif target and direction_alignment:
        strengths.append("求职方向、技能和经历已有交叉佐证，可继续做岗位关键词收敛。")
    if target and target_keywords and not direction_alignment:
        should_fix.append("目标岗位与当前经历方向缺少明显对应，匹配度表达需要重新组织。")

    if date_ratio < 0.6 and dated_entries:
        optional.append("部分经历缺少完整时间范围，阅读时不易判断成长路径。")
    if not awards:
        optional.append("奖项荣誉为空；若确实没有可保持现状，不影响继续诊断。")
    if not summary_text:
        optional.append("个人总结为空，可在核心经历足够强时继续保持精简。")

    if not should_fix:
        should_fix.append("进一步压缩泛化表述，让每条经历都落到动作与结果。")
    if not optional:
        optional.append("版式与篇幅可在内容优化完成后做最后一轮收敛。")
    if not strengths:
        strengths.append("当前简历已具备可分析的基础结构，可以按优先级逐项补强。")

    level = "基础扎实" if overall_score >= 82 else "框架可用" if overall_score >= 68 else "存在明显短板"
    primary_issue = (must_fix or should_fix)[0]
    overall_evaluation = (
        f"这份简历当前{level}，综合得分 {overall_score}/100。"
        f"优先处理“{primary_issue.rstrip('。')}”，再补强经历证据和岗位匹配表达。"
    )

    actions = [
        {
            "label": "查看全部修改建议",
            "message": "查看这次诊断的全部修改建议",
            "primary": True,
        },
        {
            "label": "查看面试风险",
            "message": "查看这次诊断发现的面试风险",
        },
        {
            "label": "查看岗位匹配依据",
            "message": "查看这次诊断的岗位匹配依据",
        },
    ]

    dimensions = {
        "content": _dimension(
            content_score,
            "核心模块完整，信息密度和阅读路径较清晰。",
            "主体框架已经具备，但仍有缺失模块或表达偏薄。",
            "关键模块不完整，会直接影响招聘方判断。",
            "查看修改建议",
            # view 文案(2026-07-16 拆分):命中 is_view_suggestions_query,
            # 走只读建议轮(cv_suggestions_agent)。原"帮我处理简历内容诊断中
            # 的问题"会命中 apply 正则直接改简历——"查看"不该等于"改"。
            "查看这次诊断的修改建议",
        ),
        "interview": _dimension(
            interview_score,
            "经历证据较充分，能够支撑面试追问。",
            "有可讲的经历，但动作、难点或结果证据还不均衡。",
            "成果证据偏少，面试官较难判断真实贡献。",
            "查看面试指导",
            "帮我强化简历里的面试证据",
        ),
        "matching": _dimension(
            matching_score,
            "方向、技能与经历之间的对应关系较清楚。",
            "已有方向基础，仍需按目标岗位收敛关键词。",
            "目标方向或技能映射不清晰，匹配判断依据不足。",
            "查看投递方向",
            "查看这次诊断的岗位匹配依据",
        ),
    }

    analysis_steps = [
        {
            "label": "结构完整度",
            "status": "done",
            "summary": "已检查教育、经历、项目、技能与时间信息。",
        },
        {
            "label": "成果证据",
            "status": "done",
            "summary": "已核对经历中的动作、技术手段、量化结果与业务影响。",
        },
        {
            "label": "面试风险",
            "status": "done",
            "summary": "已识别可能引发追问但当前证据不足的内容。",
        },
        {
            "label": "岗位匹配",
            "status": "done",
            "summary": "已评估求职方向、技能关键词与经历之间的对应关系。",
        },
    ]

    return {
        "type": "resume_diagnosis",
        "status": "success",
        "tool": "cv_analyzer_agent",
        "resume": _resume_meta(resume),
        "summary": {
            "overall_score": overall_score,
            # 这是基于简历内容的启发式竞争力分，不冒充有候选池校准的通过概率。
            "screening_score": screening_score,
            "content_score": content_score,
            "quality_score": content_score,
            "interview_score": interview_score,
            "competitiveness_score": interview_score,
            "matching_score": matching_score,
        },
        "details": {
            "overall_evaluation": overall_evaluation,
            "strengths": strengths[:3],
            "issues": {
                "must_fix": must_fix[:3],
                "should_fix": should_fix[:3],
                "optional": optional[:3],
            },
            "dimensions": dimensions,
            "analysis_steps": analysis_steps,
            "actions": actions,
            # 兼容旧卡片字段，历史前端仍可正常展示。
            "top_actions": [action["label"] for action in actions],
            "next_steps": [action["message"] for action in actions],
        },
    }
