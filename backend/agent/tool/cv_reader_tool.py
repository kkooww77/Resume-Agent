"""
CV Reader Tool - 读取简历上下文的工具

用于在 Agent 对话中获取简历的具体模块信息
"""

import re
from typing import Any, Dict, Optional
from backend.agent.tool.base import BaseTool
from backend.agent.utils.experience_entry import coerce_tool_value
from backend.agent.utils.resume_context import normalize_resume_for_context
from backend.agent.utils.resume_richtext import html_to_context_text


def _as_record(item: Any) -> Dict[str, Any]:
    """列表项可能是历史污染的 JSON 字符串，统一为 dict。"""
    if isinstance(item, dict):
        return item
    if isinstance(item, str):
        parsed = coerce_tool_value(item)
        if isinstance(parsed, dict):
            return parsed
    return {}


def strip_html(html: Any) -> str:
    """简单的 HTML 标签移除，保留纯文本"""
    if not html:
        return ""
    if isinstance(html, list):
        html = "\n".join(str(item) for item in html)
    elif not isinstance(html, str):
        html = str(html)
    import re
    clean = re.sub(r'<[^>]+>', '', html)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


class ReadCVContext(BaseTool):
    """读取当前加载的简历上下文"""

    name: str = "read_cv_context"
    description: str = """Read the current CV/Resume context.

Use this tool when you need to reference specific details from the resume.
Returns the resume content in a structured, readable format."""

    parameters: dict = {
        "type": "object",
        "properties": {
            "section": {
                "type": "string",
                "description": "The specific section to read. Default is 'all' for full resume.",
                "enum": [
                    "all", "basic", "education", "experience",
                    "projects", "skills", "awards", "opensource"
                ],
                "default": "all"
            }
        }
    }

    _resume_data: Optional[dict] = None

    class Config:
        arbitrary_types_allowed = True

    def set_resume_data(self, resume_data: dict):
        """设置当前简历数据"""
        self._resume_data = resume_data

    async def execute(self, section: str = "all") -> str:
        """执行读取简历上下文"""
        if not self._resume_data:
            return "No resume data loaded."

        if section == "all":
            return self._format_full_resume()
        return self._format_section(section)

    def _format_full_resume(self, mask_pii: bool = False) -> str:
        """格式化完整简历，带索引标记方便 AI 定位 path

        Args:
            mask_pii: 整份优化场景下为 True，仅屏蔽 basic 里的
                      email / phone / location 三个隐私字段；其余所有模块
                      （name、title、summary、教育、经历、项目、技能等）照常输出。
        """
        resume = normalize_resume_for_context(self._resume_data)
        lines = ["# CV/Resume Context\n"]

        basic = resume.get("basic", {})
        if basic:
            lines.append("## Basic Information  (path prefix: basic.*)")
            lines.append(f"Name: {basic.get('name', 'N/A')}")
            lines.append(f"Target Position: {basic.get('title', 'N/A')}")
            if not mask_pii:
                if basic.get('email'):
                    lines.append(f"Email: {basic.get('email')}")
                if basic.get('phone'):
                    lines.append(f"Phone: {basic.get('phone')}")
                if basic.get('location'):
                    lines.append(f"Location: {basic.get('location')}")
            if basic.get('summary'):
                lines.append(f"Summary: {strip_html(basic.get('summary'))}")
            lines.append("")

        education = resume.get("education", [])
        if education:
            seen = set()
            unique_education = []
            for edu in education:
                school = edu.get('school', '')
                degree = edu.get('degree', '')
                key = f"{school}_{degree}"
                if key not in seen and school:
                    seen.add(key)
                    unique_education.append(edu)

            if unique_education:
                lines.append("## Education  (path prefix: education[N].*)")
                for i, edu in enumerate(unique_education):
                    degree = edu.get('degree', '')
                    major = edu.get('major', '')
                    degree_major = f"{degree} in {major}" if degree and major else (degree or major or '')
                    lines.append(f"### [{i}] {edu.get('school')} | {degree_major}")
                    lines.append(f"  Period: {edu.get('startDate')} - {edu.get('endDate')}")
                    if edu.get('gpa'):
                        lines.append(f"  GPA: {edu.get('gpa')}")
                    if edu.get('description'):
                        lines.append(f"  Description: {strip_html(edu.get('description'))}")
                    lines.append("")

        # 工作经历：独立板块（menuSections 里排在实习经历之前），path 前缀不同，
        # 标注清楚 agent 才能把改写路由回正确板块，不会把工作写进实习。
        work_experience = resume.get("workExperience", [])
        if work_experience:
            lines.append("## Full-time Experience 工作经历  (path prefix: workExperience[N].*)")
            for i, exp in enumerate(work_experience):
                details = exp.get("details", "")
                lines.append(f"### [{i}] {exp.get('company')} | {exp.get('position', '')}")
                lines.append(f"  Period: {exp.get('date', '')}")
                if details:
                    lines.append("  Details:")
                    body = (
                        html_to_context_text(str(details))
                        if re.search(r"<[a-z]", str(details), re.I)
                        else strip_html(str(details))
                    )
                    for detail_line in body.split("\n"):
                        detail_line = detail_line.strip()
                        if detail_line:
                            lines.append(f"  {detail_line}")
                lines.append("")

        experience = resume.get("experience", [])
        if experience:
            # 标题保留 "## Work Experience" 前缀：optimize_progress.OPTIMIZE_MODULES
            # 用它切分简历文本，改前缀会静默破坏整份优化的模块识别
            lines.append("## Work Experience 实习经历  (path prefix: experience[N].*)")
            for i, exp in enumerate(experience):
                details = exp.get("details", "")
                lines.append(f"### [{i}] {exp.get('company')} | {exp.get('position', '')}")
                lines.append(f"  Period: {exp.get('date', '')}")
                if details:
                    lines.append("  Details:")
                    body = (
                        html_to_context_text(str(details))
                        if re.search(r"<[a-z]", str(details), re.I)
                        else strip_html(str(details))
                    )
                    for detail_line in body.split("\n"):
                        detail_line = detail_line.strip()
                        if detail_line:
                            lines.append(f"  {detail_line}")
                lines.append("")

        projects = resume.get("projects", [])
        if projects:
            lines.append("## Projects  (path prefix: projects[N].*)")
            for i, proj in enumerate(projects):
                lines.append(f"### [{i}] {proj.get('name')} | {proj.get('role', '')}")
                lines.append(f"  Period: {proj.get('date', '')}")
                if proj.get('description'):
                    lines.append(f"  Description: {strip_html(proj.get('description'))}")
                if proj.get('link'):
                    lines.append(f"  Link: {proj.get('link')}")
                lines.append("")

        opensource = resume.get("openSource", [])
        if opensource:
            lines.append("## Open Source  (path prefix: openSource[N].*)")
            for i, os_item in enumerate(opensource):
                lines.append(f"### [{i}] {os_item.get('name', '')}")
                if os_item.get('role'):
                    lines.append(f"  Role: {os_item.get('role')}")
                if os_item.get('date'):
                    lines.append(f"  Period: {os_item.get('date')}")
                if os_item.get('description'):
                    lines.append(f"  Description: {strip_html(os_item.get('description'))}")
                if os_item.get('repo'):
                    lines.append(f"  Repo: {os_item.get('repo')}")
                if os_item.get('link'):
                    lines.append(f"  Link: {os_item.get('link')}")
                lines.append("")

        skills = resume.get("skillContent", "")
        if skills:
            lines.append("## Skills  (path: skillContent)")
            lines.append(strip_html(str(skills)))
            lines.append("")

        self_eval = resume.get("selfEvaluation", "")
        if self_eval:
            lines.append("## Self Evaluation  (path: selfEvaluation)")
            lines.append(strip_html(self_eval))
            lines.append("")

        awards = resume.get("awards", [])
        if awards:
            lines.append("## Awards  (path prefix: awards[N].*)")
            for i, award in enumerate(awards):
                lines.append(f"### [{i}] {award.get('title', '')}")
                if award.get('issuer'):
                    lines.append(f"  Issuer: {award.get('issuer')}")
                if award.get('date'):
                    lines.append(f"  Date: {award.get('date')}")
                lines.append("")

        return "\n".join(lines)

    def _format_section(self, section: str) -> str:
        """格式化单个模块"""
        resume = self._resume_data

        section_map = {
            "basic": ("Basic Information", self._format_basic),
            "education": ("Education", self._format_education),
            "experience": ("Work Experience", self._format_experience),
            "workExperience": ("Full-time Experience", self._format_work_experience),
            "projects": ("Projects", self._format_projects),
            "skills": ("Skills", self._format_skills),
            "awards": ("Awards", self._format_awards),
            "opensource": ("Open Source", self._format_opensource),
        }

        if section not in section_map:
            return f"Unknown section: {section}"

        title, formatter = section_map[section]
        content = formatter(resume)
        return f"## {title}\n\n{content}" if content else f"No data for {title}"

    def _format_basic(self, resume: dict) -> str:
        basic = resume.get("basic", {})
        return "\n".join([
            f"Name: {basic.get('name', 'N/A')}",
            f"Position: {basic.get('title', 'N/A')}",
            f"Email: {basic.get('email', 'N/A')}",
            f"Phone: {basic.get('phone', 'N/A')}",
            f"Location: {basic.get('location', 'N/A')}",
        ])

    def _format_education(self, resume: dict) -> str:
        education = resume.get("education", [])
        if not education:
            return "No education data."

        seen = set()
        unique_education = []
        for edu in education:
            school = edu.get('school', '')
            degree = edu.get('degree', '')
            key = f"{school}_{degree}"
            if key not in seen and school:
                seen.add(key)
                unique_education.append(edu)

        if not unique_education:
            return "No education data."

        lines = []
        for edu in unique_education:
            degree = edu.get('degree', '')
            major = edu.get('major', '')
            degree_major = f"{degree} in {major}" if degree and major else (degree or major or '')
            lines.append(f"- **{edu.get('school')}** | {degree_major}")
            lines.append(f"  Period: {edu.get('startDate')} - {edu.get('endDate')}")
            if edu.get('gpa'):
                lines.append(f"  GPA: {edu.get('gpa')}")
            if edu.get('description'):
                lines.append(f"  Description: {strip_html(edu.get('description'))}")
            lines.append("")
        return "\n".join(lines)

    def _format_experience(self, resume: dict) -> str:
        """实习经历（experience 板块）。"""
        return self._format_experience_items(resume.get("experience", []), "experience")

    def _format_work_experience(self, resume: dict) -> str:
        """工作经历（workExperience 板块，与实习并行的独立板块）。"""
        return self._format_experience_items(
            resume.get("workExperience", []), "work experience"
        )

    def _format_experience_items(self, experience: list, label: str) -> str:
        if not experience:
            return f"No {label} data."
        lines = []
        for i, exp in enumerate(experience):
            exp = _as_record(exp)
            company = exp.get("company") or exp.get("title") or "未知公司"
            position = exp.get("position") or exp.get("subtitle") or ""
            date = exp.get("date") or exp.get("period") or ""
            details = exp.get("details") or exp.get("description") or ""
            lines.append(f"### [{i}] {company} | {position}")
            lines.append(f"  Period: {date}")
            if details:
                lines.append("  Details:")
                body = (
                    html_to_context_text(str(details))
                    if re.search(r"<[a-z]", str(details), re.I)
                    else strip_html(str(details))
                )
                for detail_line in body.split("\n"):
                    detail_line = detail_line.strip()
                    if detail_line:
                        lines.append(f"  {detail_line}")
            lines.append("")
        return "\n".join(lines)

    def _format_projects(self, resume: dict) -> str:
        projects = resume.get("projects", [])
        if not projects:
            return "No projects data."
        lines = []
        for i, proj in enumerate(projects):
            lines.append(f"### [{i}] {proj.get('name')} | {proj.get('role', '')}")
            lines.append(f"  Period: {proj.get('date', '')}")
            if proj.get('description'):
                lines.append(f"  Description: {strip_html(proj.get('description'))}")
            if proj.get('link'):
                lines.append(f"  Link: {proj.get('link')}")
            lines.append("")
        return "\n".join(lines)

    def _format_skills(self, resume: dict) -> str:
        return strip_html(resume.get("skillContent", "")) or "No skills data."

    def _format_awards(self, resume: dict) -> str:
        awards = resume.get("awards", [])
        if not awards:
            return "No awards data."
        lines = []
        for award in awards:
            lines.append(f"- **{award.get('title', '')}**")
            if award.get('issuer'):
                lines.append(f"  Issuer: {award.get('issuer')}")
            if award.get('date'):
                lines.append(f"  Date: {award.get('date')}")
            lines.append("")
        return "\n".join(lines)

    def _format_opensource(self, resume: dict) -> str:
        opensource = resume.get("openSource", [])
        if not opensource:
            return "No open source data."
        lines = []
        for i, os_item in enumerate(opensource):
            lines.append(f"### [{i}] {os_item.get('name', '')}")
            if os_item.get('role'):
                lines.append(f"  Role: {os_item.get('role')}")
            if os_item.get('date'):
                lines.append(f"  Period: {os_item.get('date')}")
            if os_item.get('description'):
                lines.append(f"  Description: {strip_html(os_item.get('description'))}")
            if os_item.get('repo'):
                lines.append(f"  Repo: {os_item.get('repo')}")
            if os_item.get('link'):
                lines.append(f"  Link: {os_item.get('link')}")
            lines.append("")
        return "\n".join(lines)
