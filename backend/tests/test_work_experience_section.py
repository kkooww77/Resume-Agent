"""工作经历独立板块的后端支持（PR #34 配套，2026-07-21）。

前端把「工作经历(workExperience)」与「实习经历(experience)」拆成两个并行板块，
本组测试锁住后端四条链路必须同时认这两个板块：
PDF 渲染 / agent 简历 context / agent 全文阅读 / 诊断统计。
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.core.logger import setup_logging
setup_logging(False, "INFO", "logs/test")

from backend.json_normalizer import normalize_resume_json
from backend.latex_generator import json_to_latex
from backend.latex_sections import (
    SECTION_GENERATORS,
    generate_section_work_experience,
)
from backend.agent.utils.resume_context import normalize_resume_for_context
from backend.agent.utils.experience_entry import is_indexed_array_item_path
from backend.agent.application.resume_diagnosis import build_resume_diagnosis

_WORK = {
    "company": "腾讯",
    "position": "后端工程师",
    "date": "2024.01 - 2025.06",
    "details": "<ul class=\"custom-list\"><li><p>主导搜索服务拆分，超时率下降 80%</p></li></ul>",
}
_INTERN = {
    "company": "深言科技",
    "position": "算法实习生",
    "date": "2023.07 - 2023.12",
    "details": "<ul class=\"custom-list\"><li><p>参与 RAG 检索链路优化</p></li></ul>",
}


def _resume(**over):
    base = {
        "basic": {"name": "韦宇", "title": "后端开发"},
        "education": [{"school": "华南理工大学", "major": "计算机", "degree": "本科"}],
        "workExperience": [_WORK],
        "experience": [_INTERN],
        "projects": [],
        "openSource": [],
        "skillContent": "<p>Java / Go</p>",
    }
    base.update(over)
    return base


# ---- PDF：LaTeX 生成器 ----

def test_work_experience_generator_registered():
    assert SECTION_GENERATORS.get("workExperience") is generate_section_work_experience
    assert SECTION_GENERATORS.get("work_experience") is generate_section_work_experience


def test_work_experience_renders_own_section_only():
    data = {
        "workExperience": [{"title": "腾讯", "subtitle": "后端工程师", "date": "2024", "highlights": ["<p>拆分服务</p>"]}],
        "internships": [{"title": "深言科技", "subtitle": "实习生", "date": "2023", "highlights": ["<p>实习</p>"]}],
    }
    out = "\n".join(generate_section_work_experience(data, {"workExperience": "工作经历"}))
    assert "\\section{工作经历}" in out
    assert "腾讯" in out
    assert "深言科技" not in out  # 不串实习板块的数据


def test_work_experience_title_falls_back_and_respects_rename():
    data = {"workExperience": [{"title": "A", "subtitle": "", "date": "", "highlights": []}]}
    assert "\\section{工作经历}" in "\n".join(generate_section_work_experience(data))
    renamed = "\n".join(generate_section_work_experience(data, {"workExperience": "全职经历"}))
    assert "\\section{全职经历}" in renamed


def test_work_experience_empty_renders_nothing():
    # 老简历没有该板块时不得产出空 section
    assert generate_section_work_experience({}) == []
    assert generate_section_work_experience({"workExperience": []}) == []


# ---- PDF：完整渲染链路（normalize → json_to_latex），不可只测生成器 ----
# 2026-07-21 端到端实测教训：只直接调 generate_section_work_experience 会绕过
# normalize_resume_json，漏掉「workExperience 被子串匹配误判改名」这类上游 bug。

_PDF_PAYLOAD = {
    "name": "韦宇",
    "contact": {"phone": "", "email": ""},
    "workExperience": [
        {"title": "腾讯科技", "subtitle": "高级后端工程师", "date": "2024.01 - 2025.06",
         "highlights": ["<ul class=\"custom-list\"><li><p>负责搜索服务架构拆分</p></li></ul>"]},
    ],
    "internships": [
        {"title": "深言科技", "subtitle": "算法实习生", "date": "2023.07 - 2023.12",
         "highlights": ["<ul class=\"custom-list\"><li><p>参与 RAG 检索优化</p></li></ul>"]},
    ],
    "education": [],
    "projects": [],
    "sectionOrder": ["workExperience", "internships"],
    "sectionTitles": {"workExperience": "工作经历", "internships": "实习经历"},
}


def test_normalizer_keeps_work_experience_key():
    """normalize 不得把 workExperience 误判成 experience 并改名（PDF 丢段根因）。"""
    normalized = normalize_resume_json(_PDF_PAYLOAD)
    assert "腾讯科技" in str(normalized.get("workExperience")), (
        f"workExperience 丢失或被改名，实际 keys={list(normalized.keys())}"
    )
    # 实习经历不受影响
    assert "深言科技" in str(normalized.get("internships"))


def test_full_latex_pipeline_renders_both_sections():
    """前端真实调用形态：显式传 section_order（renderPDF 传了 sectionOrder 时）。"""
    latex = json_to_latex(_PDF_PAYLOAD, ["workExperience", "internships"])
    assert "工作经历" in latex and "腾讯科技" in latex, "工作经历板块在 PDF 链路中丢失"
    assert "实习经历" in latex and "深言科技" in latex, "实习经历板块受影响"


def test_full_latex_pipeline_default_order_covers_work_experience():
    """renderPDF 的 sectionOrder 是可选参数，未传时回落 DEFAULT_SECTION_ORDER，
    该默认顺序必须包含 workExperience，否则这条路径仍会丢整段。"""
    latex = json_to_latex(_PDF_PAYLOAD)
    assert "腾讯科技" in latex, "默认 section 顺序漏掉 workExperience"
    assert "深言科技" in latex


def test_full_latex_pipeline_legacy_resume_unaffected():
    """老简历（无 workExperience）不产出空的工作经历 section。"""
    payload = {k: v for k, v in _PDF_PAYLOAD.items() if k != "workExperience"}
    payload["sectionOrder"] = ["internships"]
    latex = json_to_latex(payload)
    assert "深言科技" in latex
    assert "工作经历" not in latex


# ---- agent：简历 context 注入 ----

def test_context_keeps_two_sections_separate():
    n = normalize_resume_for_context(_resume())
    assert [e["company"] for e in n["workExperience"]] == ["腾讯"]
    assert [e["company"] for e in n["experience"]] == ["深言科技"]


def test_context_legacy_resume_without_work_experience():
    n = normalize_resume_for_context(_resume(workExperience=None))
    assert n["workExperience"] == []
    assert [e["company"] for e in n["experience"]] == ["深言科技"]


def test_context_normalizes_backend_shaped_work_items():
    # 后端 internships 形态（title/subtitle/highlights）也要能归一
    n = normalize_resume_for_context(
        _resume(workExperience=[{"title": "字节", "subtitle": "工程师", "highlights": ["做了A", "做了B"]}])
    )
    item = n["workExperience"][0]
    assert item["company"] == "字节" and item["position"] == "工程师"
    assert "做了A" in item["details"] and "做了B" in item["details"]


# ---- 诊断：两个板块合并统计 ----

def test_diagnosis_counts_both_sections():
    both = build_resume_diagnosis(_resume())
    only_intern = build_resume_diagnosis(_resume(workExperience=[]))
    # 合并统计：多一段工作经历应带来更强的结构完整度信号（分数不低于只有实习时）
    assert both["summary"]["content_score"] >= only_intern["summary"]["content_score"]


def test_diagnosis_sees_work_experience_when_internship_empty():
    # 关键回归：experience 为空列表时，旧实现「首个命中即返回」会直接返回 []
    # 导致 workExperience 永远读不到；合并后必须能看见工作经历
    work_only = build_resume_diagnosis(_resume(experience=[]))
    empty = build_resume_diagnosis(_resume(experience=[], workExperience=[]))
    assert work_only["summary"]["content_score"] > empty["summary"]["content_score"]


# ---- cv_editor：整条数组项路径 ----

def test_indexed_path_accepts_work_experience():
    assert is_indexed_array_item_path("workExperience[0]")
    assert is_indexed_array_item_path("experience[1]")
    assert not is_indexed_array_item_path("workExperience[0].details")
