from backend.html_to_latex import html_to_latex
from backend.json_normalizer import normalize_resume_json
from backend.latex_sections import generate_section_opensource


def test_supported_rich_text_blue_is_preserved_in_latex():
    latex = html_to_latex(
        '<p><span style="color: #2F5597"><strong>蓝色强调</strong></span>普通文字</p>'
    )

    assert r'\textcolor[HTML]{2F5597}{\textbf{蓝色强调}}普通文字' in latex


def test_supported_rgb_blue_is_preserved_but_other_colors_are_ignored():
    supported = html_to_latex('<p><span style="color: rgb(47, 85, 151)">蓝色</span></p>')
    unsupported = html_to_latex('<p><span style="color: #ff0000">红色</span></p>')

    assert r'\textcolor[HTML]{2F5597}{蓝色}' in supported
    assert r'\textcolor' not in unsupported
    assert '红色' in unsupported


def test_opensource_font_size_fields_survive_normalization():
    normalized = normalize_resume_json(
        {
            'openSource': [
                {
                    'title': 'Resume Agent',
                    'repoUrl': 'https://github.com/example/resume-agent',
                    'projectNameFontSize': 18,
                    'repoUrlFontSize': 10,
                }
            ]
        }
    )

    item = normalized['openSource'][0]
    assert item['name'] == 'Resume Agent'
    assert item['repo'] == 'https://github.com/example/resume-agent'
    assert item['projectNameFontSize'] == 18
    assert item['repoUrlFontSize'] == 10


def test_opensource_description_stays_in_body_after_normalization():
    normalized = normalize_resume_json(
        {
            'openSource': [
                {
                    'name': 'Resume Agent',
                    'description': '<p>贡献说明</p>',
                }
            ]
        }
    )

    item = normalized['openSource'][0]
    assert item['description'] == '<p>贡献说明</p>'
    assert 'role' not in item


def test_inline_opensource_uses_separate_repo_column_and_custom_font_sizes():
    content = generate_section_opensource(
        {
            'openSource': [
                {
                    'name': 'Resume Agent',
                    'repo': 'https://github.com/example/resume_agent/pull/4827',
                    'projectNameFontSize': 18,
                    'repoUrlFontSize': 10,
                    'description': '<p>贡献说明</p>',
                }
            ],
            'globalSettings': {
                'openSourceRepoDisplay': 'inline',
                'openSourceRepoLabel': '',
            },
        }
    )
    latex = '\n'.join(content)

    assert r'\datedsubsectionwithrepo{' in latex
    assert r'\fontsize{13.5pt}{16.2pt}\selectfont \textbf{Resume Agent}' in latex
    assert r'\fontsize{7.5pt}{9pt}\selectfont \textit{' in latex
    assert r'\href{https://github.com/example/resume\_agent/pull/4827}' in latex
    assert r'\nolinkurl{https://github.com/example/resume_agent/pull/4827}' in latex


def test_default_opensource_repo_font_size_is_explicitly_nine_points():
    content = generate_section_opensource(
        {
            'openSource': [
                {
                    'name': 'Resume Agent',
                    'repo': 'https://github.com/example/resume-agent',
                    'projectNameFontSize': 15,
                    'repoUrlFontSize': 12,
                }
            ],
            'globalSettings': {'openSourceRepoDisplay': 'inline'},
        }
    )

    latex = '\n'.join(content)
    assert r'\fontsize{9pt}{10.8pt}\selectfont \textit{' in latex
    assert r'\fontsize{11.25pt}' not in latex
