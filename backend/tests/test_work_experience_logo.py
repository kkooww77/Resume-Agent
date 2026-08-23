"""工作经历板块的 Logo 处理回归测试。

背景（2026-08-23 线上事故）：工作经历板块复用实习渲染器，但
`download_logos_to_dir` 与 `_sanitize_resume_for_available_assets` 当时都只认
`internships`。结果是简历里的公司 Logo 一旦挂在工作经历上：

1. Logo 文件从不落盘；
2. 保护函数不剥掉 logo 引用；
3. 渲染器照样写 `\\includegraphics{logos/...}` → xdvipdfmx 找不到文件 →
   **整份 PDF 导出 500**。

线上失败率因此从 7 月的 0.0% 跳到 8 月的 8.0%（801/10006）。

另有一个同源隐患：两个板块的 Logo 文件名都是 `logo_{idx}.png`，会互相覆盖，
工作经历第 N 条会顶掉实习第 N 条的 Logo。故工作经历使用独立文件名前缀。
"""

from backend.latex_generator import _sanitize_resume_for_available_assets, json_to_latex
from backend.latex_sections import (
    WORK_EXPERIENCE_LOGO_PREFIX,
    generate_section_internships,
    generate_section_work_experience,
)


def _resume(**sections):
    base = {"name": "测试", "email": "t@example.com", "globalSettings": {}}
    base.update(sections)
    return base


def _item(company="字节跳动", **extra):
    # 后端形态用 title/subtitle（generate_section_internships 直接读这两个键，
    # 不再过 normalize），与 test_work_experience_section.py 的约定一致。
    item = {"title": company, "subtitle": "后端工程师", "date": "2025.01-2025.06"}
    item.update(extra)
    return item


class TestSanitizeStripsUnavailableLogos:
    """保护函数必须一视同仁地处理工作经历，否则 LaTeX 会引用不存在的文件。"""

    def test_work_experience_logo_stripped_when_file_missing(self):
        resume = _resume(workExperience=[_item(logo="bytedance", logoSize=24)])
        sanitized = _sanitize_resume_for_available_assets(
            resume, logo_map={}, school_logo_map={}, work_logo_map={}
        )
        item = sanitized["workExperience"][0]
        assert "logo" not in item
        assert "logoSize" not in item

    def test_work_experience_logo_kept_when_file_present(self):
        resume = _resume(workExperience=[_item(logo="bytedance")])
        sanitized = _sanitize_resume_for_available_assets(
            resume,
            logo_map={},
            school_logo_map={},
            work_logo_map={0: f"{WORK_EXPERIENCE_LOGO_PREFIX}_0.png"},
        )
        assert sanitized["workExperience"][0]["logo"] == "bytedance"

    def test_internships_unaffected_by_work_logo_map(self):
        """两个板块的可用性互相独立：工作经历有图不该让实习的缺图引用活下来。"""
        resume = _resume(
            internships=[_item(logo="tencent")],
            workExperience=[_item(logo="bytedance")],
        )
        sanitized = _sanitize_resume_for_available_assets(
            resume,
            logo_map={},
            school_logo_map={},
            work_logo_map={0: f"{WORK_EXPERIENCE_LOGO_PREFIX}_0.png"},
        )
        assert "logo" not in sanitized["internships"][0]
        assert sanitized["workExperience"][0]["logo"] == "bytedance"


class TestLogoFilenamesDoNotCollide:
    """两个板块必须写/读不同的文件名，否则同下标的 Logo 会互相覆盖。"""

    def test_work_experience_uses_distinct_prefix(self):
        work = generate_section_work_experience(
            _resume(workExperience=[_item(logo="bytedance")])
        )
        intern = generate_section_internships(
            _resume(internships=[_item(logo="tencent")])
        )
        work_tex, intern_tex = "\n".join(work), "\n".join(intern)

        assert f"logos/{WORK_EXPERIENCE_LOGO_PREFIX}_0.png" in work_tex
        assert "logos/logo_0.png" in intern_tex
        # 关键：工作经历不得引用实习的文件名
        assert "logos/logo_0.png" not in work_tex

    def test_both_sections_in_one_resume_reference_different_files(self):
        resume = _resume(
            internships=[_item("腾讯", logo="tencent")],
            workExperience=[_item("字节跳动", logo="bytedance")],
        )
        tex = json_to_latex(resume, ["workExperience", "internships"])
        assert f"logos/{WORK_EXPERIENCE_LOGO_PREFIX}_0.png" in tex
        assert "logos/logo_0.png" in tex
        assert "腾讯" in tex and "字节跳动" in tex


class TestFullPipelineDoesNotEmitDanglingReference:
    """端到端：走 json_to_latex 全链路，缺图时不能留下任何 includegraphics。"""

    def test_no_includegraphics_when_work_logo_unavailable(self):
        resume = _resume(workExperience=[_item(logo="bytedance")])
        sanitized = _sanitize_resume_for_available_assets(
            resume, logo_map={}, school_logo_map={}, work_logo_map={}
        )
        tex = json_to_latex(sanitized, ["workExperience"])
        # 只看正文里的图片引用：前言有 \def\includegraphics 占位，不能用裸词判定
        assert r"\includegraphics[" not in tex, "缺图时仍引用图片 → xdvipdfmx 会致命失败"
        assert "logos/" not in tex.split(r"\begin{document}")[1]
        # 内容本身要保留，只是不带 Logo
        assert "字节跳动" in tex
