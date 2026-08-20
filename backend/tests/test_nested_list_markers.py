from backend.html_to_latex import html_to_latex
from backend.latex_sections import (
    generate_section_education,
    generate_section_experience,
    generate_section_internships,
    generate_section_projects,
)


NESTED_LIST_HTML = (
    '<ul><li><p>一级内容</p>'
    '<ul><li><p>二级内容</p></li></ul>'
    '</li></ul>'
)


def assert_nested_markers_are_preserved(latex: str):
    assert latex.count(r'label=\footnotesize$\bullet$') == 1
    assert latex.count(r'label=\footnotesize$\circ$') == 1
    assert latex.index(r'label=\footnotesize$\bullet$') < latex.index(
        r'label=\footnotesize$\circ$'
    )


def test_nested_unordered_list_uses_hollow_second_level_marker():
    assert_nested_markers_are_preserved(html_to_latex(NESTED_LIST_HTML))


def test_sibling_top_level_lists_still_use_solid_markers():
    latex = html_to_latex(
        '<ul><li><p>第一组</p></li></ul><ul><li><p>第二组</p></li></ul>'
    )

    assert latex.count(r'label=\footnotesize$\bullet$') == 2
    assert r'label=\footnotesize$\circ$' not in latex


def test_project_section_preserves_nested_unordered_list_markers():
    latex = '\n'.join(
        generate_section_projects(
            {'projects': [{'title': '项目', 'highlights': [NESTED_LIST_HTML]}]}
        )
    )

    assert_nested_markers_are_preserved(latex)


def test_education_section_preserves_nested_unordered_list_markers():
    latex = '\n'.join(
        generate_section_education(
            {'education': [{'title': '学校', 'details': [NESTED_LIST_HTML]}]}
        )
    )

    assert_nested_markers_are_preserved(latex)


def test_internship_section_preserves_nested_unordered_list_markers():
    latex = '\n'.join(
        generate_section_internships(
            {
                'internships': [
                    {'title': '公司', 'subtitle': '岗位', 'highlights': [NESTED_LIST_HTML]}
                ]
            }
        )
    )

    assert_nested_markers_are_preserved(latex)


def test_work_experience_section_preserves_nested_unordered_list_markers():
    latex = '\n'.join(
        generate_section_experience(
            {
                'experience': [
                    {'company': '公司', 'position': '岗位', 'details': NESTED_LIST_HTML}
                ]
            }
        )
    )

    assert_nested_markers_are_preserved(latex)
