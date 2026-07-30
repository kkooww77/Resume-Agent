"""基础信息「工作年限」字段（2026-07-21）。

字段名含 "work"，会被 json_normalizer 里 experience 的 r'work' 子串模式吞掉
（实测曾变成 experience:[{'title':'3年经验'}]，PDF 完全不渲染），故锁住：
normalize 保留原字段 + LaTeX header 正确拼接 + 老简历不受影响。
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.core.logger import setup_logging
setup_logging(False, "INFO", "logs/test")

from backend.json_normalizer import normalize_resume_json
from backend.latex_generator import json_to_latex

_BASE = {
    "name": "张三",
    "contact": {"phone": "138", "email": "a@b.c", "location": "深圳"},
    "objective": "后端开发",
    "education": [],
    "internships": [],
    "sectionOrder": [],
}


def _contact_line(resume: dict) -> str:
    latex = json_to_latex(resume)
    return next(l for l in latex.split("\n") if "contactInfo" in l)


def test_normalizer_keeps_work_years_key():
    n = normalize_resume_json({"name": "张三", "workYears": "3年经验", "contact": {}})
    assert n.get("workYears") == "3年经验", f"workYears 被吞，keys={list(n.keys())}"
    # 不得被误当成一条工作经历
    assert not n.get("experience"), f"workYears 误进 experience: {n.get('experience')}"


def test_work_years_renders_in_contact_line():
    line = _contact_line({**_BASE, "workYears": "3年经验"})
    assert "3年经验" in line


def test_work_years_absent_leaves_line_clean():
    """老简历没有该字段时，不得多出空位或分隔符。"""
    line = _contact_line(_BASE)
    assert "经验" not in line
    assert line.rstrip().endswith("{}")


def test_work_years_coexists_with_birth_date():
    """与生日/年龄同处第 5 位时用 · 分隔，两者都在。"""
    line = _contact_line({**_BASE, "workYears": "5年经验", "birthDate": "2000-01"})
    assert "5年经验" in line and "2000-01" in line
    assert "textperiodcentered" in line


def test_work_years_label_mode_text_adds_prefix():
    """字段标签模式=text 时加「工作年限：」前缀（与其它 header 字段一致）。"""
    line = _contact_line({
        **_BASE,
        "workYears": "3年经验",
        "globalSettings": {"fieldLabelModes": {"workYears": "text"}},
    })
    assert "工作年限：3年经验" in line
