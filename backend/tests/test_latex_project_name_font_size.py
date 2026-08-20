from backend.json_normalizer import normalize_resume_json
from backend.latex_sections import generate_section_projects


def test_project_name_font_size_survives_normalization():
    normalized = normalize_resume_json(
        {
            'projects': [
                {
                    'name': 'Agent Runtime',
                    'projectNameFontSize': 18,
                    'projectLinkFontSize': 13,
                    'description': '<p>项目说明</p>',
                }
            ]
        }
    )

    assert normalized['projects'][0]['projectNameFontSize'] == 18
    assert normalized['projects'][0]['projectLinkFontSize'] == 13


def test_project_name_uses_custom_font_size_in_latex():
    content = generate_section_projects(
        {
            'projects': [
                {
                    'title': 'Agent Runtime',
                    'projectNameFontSize': 18,
                    'highlights': ['负责运行时设计'],
                }
            ]
        }
    )

    latex = '\n'.join(content)
    assert r'\fontsize{13.5pt}{16.2pt}\selectfont \textbf{Agent Runtime}' in latex


def test_invalid_project_name_font_size_falls_back_to_template_size():
    content = generate_section_projects(
        {
            'projects': [
                {
                    'title': 'Agent Runtime',
                    'projectNameFontSize': 'not-a-number',
                }
            ]
        }
    )

    assert r'\fontsize' not in '\n'.join(content)


def test_project_link_uses_custom_font_size_inline():
    content = generate_section_projects(
        {
            'projects': [
                {
                    'title': 'Agent Runtime',
                    'link': 'https://github.com/example/runtime',
                    'projectLinkFontSize': 10,
                }
            ],
            'globalSettings': {
                'projectLinkDisplay': 'inline',
                'projectLinkLabel': 'GitHub',
            },
        }
    )

    latex = '\n'.join(content)
    assert r'\fontsize{7.5pt}{9pt}\selectfont GitHub: \textit{\href{https://github.com/example/runtime}' in latex


def test_project_link_uses_custom_font_size_below():
    content = generate_section_projects(
        {
            'projects': [
                {
                    'title': 'Agent Runtime',
                    'link': 'https://github.com/example/runtime',
                    'projectLinkFontSize': 16,
                }
            ],
            'globalSettings': {
                'projectLinkDisplay': 'below',
                'projectLinkLabel': '',
            },
        }
    )

    latex = '\n'.join(content)
    assert r'\fontsize{12pt}{14.4pt}\selectfont \textit{\href{https://github.com/example/runtime}' in latex
