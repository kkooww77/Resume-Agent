from pathlib import Path

import fitz
import pytest

from backend.latex_generator import (
    _normalize_latex_font_size,
    compile_latex_to_pdf,
    json_to_latex,
)
from backend.latex_utils import resolve_xelatex_executable


TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "latex-resume-template"
BODY_TEXT = "FONT SIZE REGRESSION BODY"


@pytest.mark.parametrize(
    ("raw_value", "expected"),
    [
        (8, 8),
        (9.0, 9),
        ("10", 10),
        (11, 11),
        (12, 12),
        (True, 11),
        (7, 11),
        (13, 11),
        (8.5, 11),
        ("8.5", 11),
        ("", 11),
        (None, 11),
    ],
)
def test_normalize_latex_font_size_accepts_only_integer_values_in_range(raw_value, expected):
    assert _normalize_latex_font_size(raw_value) == expected


def _render_body_font_size(requested_size: int) -> float:
    resume = {
        "name": "Font Audit",
        "contact": {},
        "summary": BODY_TEXT,
        "sectionTitles": {"summary": "Summary"},
        "sectionOrder": ["summary"],
        "globalSettings": {"latexFontSize": requested_size},
    }
    latex = json_to_latex(resume, ["summary"])
    assert f"\\documentclass[{requested_size}pt]{{resume}}" in latex

    pdf = compile_latex_to_pdf(latex, TEMPLATE_DIR, resume_data=resume)
    with fitz.open(stream=pdf.getvalue(), filetype="pdf") as document:
        for page in document:
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if BODY_TEXT in span.get("text", ""):
                            return float(span["size"])

    raise AssertionError(f"未在 {requested_size}pt PDF 中找到回归测试正文")


@pytest.mark.skipif(resolve_xelatex_executable() is None, reason="需要 XeLaTeX 才能验证实际 PDF 字号")
def test_rendered_pdf_font_size_increases_for_every_step_from_8_to_12pt():
    actual_sizes = [_render_body_font_size(size) for size in range(8, 13)]

    assert all(
        next_size > current_size
        for current_size, next_size in zip(actual_sizes, actual_sizes[1:])
    ), f"8–12pt 应逐级增大，实际 PDF 字号为 {actual_sizes}"
