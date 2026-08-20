"""
HTML to LaTeX 转换模块

将 TipTap 富文本编辑器输出的 HTML 转换为 LaTeX 代码
支持的格式：
- 加粗 <strong>/<b> -> textbf
- 斜体 <em>/<i> -> textit
- 下划线 <u> -> underline
- 无序列表 <ul><li> -> itemize
- 有序列表 <ol><li> -> enumerate
- 段落 <p> -> 换行
- 换行 <br> -> newline
"""

import re
from html.parser import HTMLParser
from typing import List, Tuple

try:
    from backend.ats_normalize import normalize_ats_text
except ImportError:  # 兼容以 backend 为 cwd 的脚本场景
    from ats_normalize import normalize_ats_text


# 富文本编辑器当前仅开放这一档正文强调色。
RICH_TEXT_BLUE_HEX = "2F5597"


def _normalize_supported_color(style: str) -> str | None:
    """从 span style 中提取并规范化当前支持的富文本颜色。"""
    match = re.search(r'(?:^|;)\s*color\s*:\s*([^;]+)', style or '', re.IGNORECASE)
    if not match:
        return None

    raw = match.group(1).strip()
    if re.fullmatch(r'#[0-9a-fA-F]{6}', raw):
        color_hex = raw[1:].upper()
    else:
        rgb_match = re.fullmatch(
            r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)',
            raw,
            re.IGNORECASE,
        )
        if not rgb_match:
            return None
        channels = tuple(max(0, min(255, int(value))) for value in rgb_match.groups())
        color_hex = ''.join(f'{channel:02X}' for channel in channels)

    return color_hex if color_hex == RICH_TEXT_BLUE_HEX else None


def _markdown_to_html(text: str) -> str:
    """Convert basic Markdown to HTML so html_to_latex can process it.
    Handles: **bold**, *italic*, # headings, - bullet lists, 1. ordered lists, blank lines → paragraphs.
    """
    lines = text.split('\n')
    html_lines: list[str] = []
    in_ul = False
    in_ol = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            html_lines.append('</ul>')
            in_ul = False
        if in_ol:
            html_lines.append('</ol>')
            in_ol = False

    def inline(s: str) -> str:
        # **bold**
        s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
        # *italic* (single star, not part of **)
        s = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', s)
        # `code`
        s = re.sub(r'`(.+?)`', r'\1', s)
        return s

    for line in lines:
        stripped = line.strip()
        # Heading
        if stripped.startswith('#'):
            close_lists()
            level = len(stripped) - len(stripped.lstrip('#'))
            content = stripped.lstrip('#').strip()
            html_lines.append(f'<p><strong>{inline(content)}</strong></p>')
        # Unordered list
        elif stripped.startswith(('- ', '• ', '* ')):
            if in_ol:
                html_lines.append('</ol>')
                in_ol = False
            if not in_ul:
                html_lines.append('<ul class="custom-list">')
                in_ul = True
            content = stripped[2:].strip() if len(stripped) > 2 else stripped[1:].strip()
            html_lines.append(f'<li><p>{inline(content)}</p></li>')
        # Ordered list
        elif re.match(r'^\d+\.[ \t]', stripped):
            if in_ul:
                html_lines.append('</ul>')
                in_ul = False
            if not in_ol:
                html_lines.append('<ol>')
                in_ol = True
            content = re.sub(r'^\d+\.[ \t]', '', stripped)
            html_lines.append(f'<li><p>{inline(content)}</p></li>')
        # Blank line
        elif stripped == '':
            close_lists()
        # Normal paragraph line
        else:
            close_lists()
            html_lines.append(f'<p>{inline(stripped)}</p>')

    close_lists()
    return '\n'.join(html_lines)


class HTMLToLatexConverter(HTMLParser):
    """HTML 到 LaTeX 转换器"""
    
    def __init__(self):
        super().__init__()
        self.result: List[str] = []
        self.tag_stack: List[str] = []
        self.in_list = False
        self.list_type = None  # 'ul' or 'ol'
        self._list_stack: List[str] = []
        self._anchor_hrefs: List[str] = []  # <a> 的 href 栈，支持嵌套 / 无 href 情况
        self._span_color_stack: List[bool] = []
        
    def handle_starttag(self, tag: str, attrs: List[Tuple[str, str]]):
        tag = tag.lower()
        self.tag_stack.append(tag)
        
        if tag in ('strong', 'b'):
            self.result.append(r'\textbf{')
        elif tag in ('em', 'i'):
            self.result.append(r'\textit{')
        elif tag == 'u':
            self.result.append(r'\underline{')
        elif tag == 'ul':
            self.in_list = True
            self.list_type = 'ul'
            self._list_stack.append('ul')
            # 常见文档层级：一级使用实心圆点，二级及更深层使用空心圆点。
            # 显式指定 label，避免 enumitem/模板默认值把所有层级都渲染成实心点。
            marker = r'\footnotesize$\bullet$' if len(self._list_stack) == 1 else r'\footnotesize$\circ$'
            self.result.append(
                r'\begin{itemize}[label=' + marker +
                r',parsep=0.2ex,leftmargin=*,labelsep=0.5em,itemindent=0em]' + '\n'
            )
        elif tag == 'ol':
            self.in_list = True
            self.list_type = 'ol'
            self._list_stack.append('ol')
            self.result.append(r'\begin{enumerate}' + '\n')
        elif tag == 'li':
            self.result.append(r'  \item ')
        elif tag == 'br':
            self.result.append(r' \\' + '\n')
        elif tag == 'p':
            # 段落开始，不需要特殊处理
            pass
        elif tag == 'span':
            color_hex = _normalize_supported_color(dict(attrs).get('style', ''))
            self._span_color_stack.append(bool(color_hex))
            if color_hex:
                self.result.append(r'\textcolor[HTML]{' + color_hex + '}{')
        elif tag == 'h1':
            self.result.append(r'\section*{')
        elif tag == 'h2':
            self.result.append(r'\subsection*{')
        elif tag == 'h3':
            self.result.append(r'\subsubsection*{')
        elif tag == 'a':
            # 富文本里的链接 → 可点击 \href（hyperref 已在 resume.cls 启用）
            # 链接文字默认斜体 + 下划线，便于区分（不依赖颜色，配合 hidelinks）
            href = dict(attrs).get('href', '').strip()
            self._anchor_hrefs.append(href)
            if href:
                self.result.append(r'\href{' + escape_href(href) + r'}{\textit{\uline{')

    def handle_endtag(self, tag: str):
        tag = tag.lower()
        if self.tag_stack and self.tag_stack[-1] == tag:
            self.tag_stack.pop()
            
        if tag in ('strong', 'b', 'em', 'i', 'u'):
            self.result.append('}')
        elif tag == 'ul':
            self.result.append(r'\end{itemize}' + '\n')
            if self._list_stack:
                self._list_stack.pop()
            self.in_list = bool(self._list_stack)
            self.list_type = self._list_stack[-1] if self._list_stack else None
        elif tag == 'ol':
            self.result.append(r'\end{enumerate}' + '\n')
            if self._list_stack:
                self._list_stack.pop()
            self.in_list = bool(self._list_stack)
            self.list_type = self._list_stack[-1] if self._list_stack else None
        elif tag == 'li':
            self.result.append('\n')
        elif tag == 'p':
            # 段落结束，添加换行
            self.result.append('\n\n')
        elif tag == 'span':
            has_color = self._span_color_stack.pop() if self._span_color_stack else False
            if has_color:
                self.result.append('}')
        elif tag in ('h1', 'h2', 'h3'):
            self.result.append('}\n')
        elif tag == 'a':
            href = self._anchor_hrefs.pop() if self._anchor_hrefs else ''
            if href:
                self.result.append('}}}')

    def handle_data(self, data: str):
        # 转义 LaTeX 特殊字符
        escaped = escape_latex(data)
        self.result.append(escaped)
        
    def get_latex(self) -> str:
        return ''.join(self.result).strip()


def escape_href(url: str) -> str:
    r"""转义 URL 用于 \href 第一参数：只处理会破坏 LaTeX 的字符，保留 URL 结构（/ : . - 等不动）。"""
    if not url:
        return ''
    for ch in ('#', '%', '&', '_', '{', '}'):
        url = url.replace(ch, '\\' + ch)
    return url


def escape_latex(text: str) -> str:
    """转义 LaTeX 特殊字符"""
    if not text:
        return ''
    
    # LaTeX 特殊字符转义映射
    replacements = [
        ('\\', r'\textbackslash{}'),
        ('&', r'\&'),
        ('%', r'\%'),
        ('$', r'\$'),
        ('#', r'\#'),
        ('_', r'\_'),
        ('{', r'\{'),
        ('}', r'\}'),
        ('~', r'\textasciitilde{}'),
        ('^', r'\textasciicircum{}'),
    ]
    
    result = text
    for old, new in replacements:
        # 避免重复转义
        if old == '\\':
            result = result.replace(old, new)
        else:
            result = result.replace(old, new)
    
    return result


def html_to_latex(html: str) -> str:
    """
    将 HTML 转换为 LaTeX

    Args:
        html: TipTap 输出的 HTML 字符串

    Returns:
        LaTeX 格式的字符串
    """
    if not html or not html.strip():
        return ''

    # ATS 归一化（弯引号/em-dash/零宽等，仅 ASCII 上下文）——必须在 LaTeX 转义之前
    html = normalize_ats_text(html)

    # 预处理：移除多余空白
    html = html.strip()

    # If the content looks like Markdown (no <tag> patterns), convert it to HTML first.
    # This handles cases where the agent writes Markdown into HTML fields.
    if not re.search(r'<[a-zA-Z]', html):
        html = _markdown_to_html(html)

    # 处理空段落（包括带属性的空段落）
    html = re.sub(r'<p[^>]*>\s*</p>', '', html)
    # 注意：不要在 HTML 阶段“删除空 li”，否则会导致 LaTeX 生成时出现
    # itemize/enumerate 环境内直接嵌套 begin{itemize} 而缺少 \item，从而编译报错。
    
    # 使用解析器转换
    converter = HTMLToLatexConverter()
    try:
        converter.feed(html)
        result = converter.get_latex()
    except Exception as e:
        # 解析失败时返回纯文本
        result = re.sub(r'<[^>]+>', '', html)
        result = escape_latex(result)
    
    # 后处理：清理多余换行
    result = re.sub(r'\n{3,}', '\n\n', result)

    # 后处理：处理“空父级列表项 + 嵌套列表”的场景
    # 目标：既满足 LaTeX 语法（必须有 \item），又不渲染出父级黑点。
    # 做法：把 `\item <nested-list>` 替换为 `\item[]\n<nested-list>`（空标签，不显示圆点）。
    result = re.sub(
        r'\\item(?:\s*\n\s*|\s+)(\\begin\{(?:itemize|enumerate)\}(?:\[[^\]]*\])?)',
        r'\\item[]\n\1',
        result
    )
    
    return result


def html_to_latex_items(html: str) -> List[str]:
    """
    将 HTML 转换为 LaTeX 列表项
    用于简历中的项目描述等
    
    Args:
        html: TipTap 输出的 HTML 字符串
        
    Returns:
        LaTeX 列表项数组
    """
    if not html or not html.strip():
        return []

    html = normalize_ats_text(html)

    # 提取列表项
    items = []
    
    # 匹配 <li> 标签内容
    li_pattern = r'<li[^>]*>(.*?)</li>'
    matches = re.findall(li_pattern, html, re.DOTALL | re.IGNORECASE)
    
    if matches:
        for match in matches:
            # 转换每个列表项内容
            item_html = match.strip()
            # 移除内部标签，保留格式
            item_latex = html_to_latex(f'<p>{item_html}</p>')
            item_latex = item_latex.strip()
            if item_latex:
                items.append(item_latex)
    else:
        # 如果没有列表，按段落分割
        p_pattern = r'<p[^>]*>(.*?)</p>'
        p_matches = re.findall(p_pattern, html, re.DOTALL | re.IGNORECASE)
        
        for match in p_matches:
            item_html = match.strip()
            if item_html:
                item_latex = html_to_latex(f'<p>{item_html}</p>')
                item_latex = item_latex.strip()
                if item_latex:
                    items.append(item_latex)
    
    return items


# 测试
if __name__ == '__main__':
    test_cases = [
        '<p>这是一段<strong>加粗</strong>文字</p>',
        '<p>支持<em>斜体</em>和<u>下划线</u></p>',
        '<ul><li>第一项</li><li>第二项</li></ul>',
        '<p>特殊字符：& % $ # _ { } ~ ^</p>',
        '<p>设计实现<strong>多维度</strong>权限管理系统</p>',
    ]
    
    for html in test_cases:
        latex = html_to_latex(html)
        print(f'HTML: {html}')
        print(f'LaTeX: {latex}')
        print('---')

