"""
通用 JSON 标准化器
智能识别和转换任意结构的简历 JSON，适配 LaTeX 模板

核心思想：
1. 不假设固定结构，智能识别字段语义
2. 递归处理嵌套结构，扁平化到标准格式
3. 支持多种表达方式（中文/英文、嵌套/扁平）
"""

from typing import Dict, Any, List, Optional
import re


class ResumeNormalizer:
    """
    简历 JSON 标准化器
    """
    
    def __init__(self):
        """
        语义映射表：识别字段的语义，而不是固定的名称
        """
        self.semantic_patterns = {
            'name': [
                r'姓名', r'名字', r'name', r'full.*name', r'用户名'
            ],
            'phone': [
                r'电话', r'手机', r'联系方式', r'phone', r'mobile', r'tel'
            ],
            'email': [
                r'邮箱', r'email', r'e-mail', r'mail'
            ],
            'location': [
                r'地址', r'所在地', r'位置', r'location', r'address', r'city'
            ],
            'objective': [
                r'求职意向', r'求职方向', r'目标职位', r'objective', r'job.*title', r'position.*wanted'
            ],
            'summary': [
                r'个人简介', r'自我评价', r'简介', r'summary', r'profile', r'个人总结'
            ],
            # 必须排在 experience 之前，且只用锚定正则：字段名 "workexperience"
            # 含子串 "experience"，落到下面的通用子串匹配会被误判成 experience 并
            # 改名，导致 PDF 渲染读不到 workExperience、工作经历整段静默丢失
            # （2026-07-21 端到端实测暴露）。中文"工作经历"仍归 experience，
            # 保持导入解析链路的既有行为不变。
            'workExperience': [
                r'^workexperience$', r'^work_experience$'
            ],
            # 同理：字段名含 "work" 会被下面 experience 的 r'work' 子串匹配吞掉，
            # 曾导致工作年限被当成一条经历（experience:[{title:'3年经验'}]）、PDF 不渲染
            'workYears': [
                r'^workyears$', r'^work_years$'
            ],
            'experience': [
                r'工作经历', r'工作经验', r'experience', r'work'
            ],
            'internships': [
                r'实习经历', r'实习经验', r'intern'
            ],
            'projects': [
                r'项目经验', r'项目经历', r'项目', r'project'
            ],
            'openSource': [
                r'开源经历', r'开源贡献', r'开源', r'opensource', r'open.*source'
            ],
            'skills': [
                r'专业技能', r'技能', r'skill', r'技术栈'
            ],
            'education': [
                r'教育经历', r'教育背景', r'education', r'学历'
            ],
            'awards': [
                r'获奖', r'荣誉', r'奖项', r'award', r'honor'
            ],
        }
    
    def normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        标准化简历 JSON

        Args:
            data: 原始 JSON（任意结构）

        Returns:
            标准化后的 JSON（LaTeX 模板格式）
        """
        normalized = {}
        contact_info = {}

        """
        第一步：递归遍历所有字段，识别语义
        """
        self._extract_fields(data, normalized, contact_info)
        
        """
        第二步：合并联系信息
        """
        if contact_info:
            normalized['contact'] = contact_info
        
        """
        第三步：标准化特定字段的结构
        """
        normalized = self._standardize_structure(normalized)
        
        return normalized
    
    def _extract_fields(
        self, 
        data: Any, 
        normalized: Dict[str, Any], 
        contact_info: Dict[str, Any],
        parent_key: str = ''
    ):
        """
        递归提取字段，识别语义
        """
        if isinstance(data, dict):
            for key, value in data.items():
                """
                识别字段的语义类型
                """
                semantic_type = self._identify_semantic_type(key)
                
                if semantic_type:
                    """
                    找到了语义匹配
                    """
                    if semantic_type in ['phone', 'email', 'location']:
                        """
                        联系信息：放入 contact
                        """
                        if isinstance(value, str):
                            contact_info[semantic_type] = value
                        elif isinstance(value, dict):
                            """
                            如果是嵌套对象，继续提取
                            """
                            self._extract_fields(value, normalized, contact_info, key)
                    else:
                        """
                        其他字段：直接映射
                        """
                        if semantic_type in normalized:
                            """
                            字段已存在，合并
                            """
                            normalized[semantic_type] = self._merge_values(
                                normalized[semantic_type],
                                value
                            )
                        else:
                            normalized[semantic_type] = value
                else:
                    """
                    没有找到语义匹配
                    """
                    if key in ['基本信息', 'basic', 'info', 'personal']:
                        """
                        特殊处理：基本信息对象
                        """
                        if isinstance(value, dict):
                            self._extract_fields(value, normalized, contact_info, key)
                    else:
                        """
                        保持原样，但递归处理值
                        """
                        if isinstance(value, dict):
                            normalized[key] = self._process_nested_dict(value)
                        elif isinstance(value, list):
                            normalized[key] = self._process_list(value)
                        else:
                            normalized[key] = value
        
        elif isinstance(data, list):
            """
            如果顶层是列表，尝试识别每个元素
            """
            for item in data:
                if isinstance(item, dict):
                    self._extract_fields(item, normalized, contact_info, parent_key)
    
    def _identify_semantic_type(self, field_name: str) -> Optional[str]:
        """
        识别字段的语义类型
        
        Args:
            field_name: 字段名
        
        Returns:
            语义类型（如 'name', 'email'）或 None
        """
        field_lower = field_name.lower().strip()
        
        for semantic_type, patterns in self.semantic_patterns.items():
            for pattern in patterns:
                if re.search(pattern, field_lower, re.IGNORECASE):
                    return semantic_type
        
        return None
    
    def _merge_values(self, existing: Any, new: Any) -> Any:
        """
        合并两个值
        """
        if isinstance(existing, list) and isinstance(new, list):
            return existing + new
        elif isinstance(existing, dict) and isinstance(new, dict):
            merged = existing.copy()
            merged.update(new)
            return merged
        elif isinstance(existing, str) and isinstance(new, str):
            return f"{existing}\n{new}"
        else:
            """
            类型不同，保留新值
            """
            return new
    
    def _process_nested_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理嵌套字典
        """
        result = {}
        for key, value in data.items():
            if isinstance(value, dict):
                result[key] = self._process_nested_dict(value)
            elif isinstance(value, list):
                result[key] = self._process_list(value)
            else:
                result[key] = value
        return result
    
    def _process_list(self, data: List[Any]) -> List[Any]:
        """
        处理列表
        """
        result = []
        for item in data:
            if isinstance(item, dict):
                result.append(self._process_nested_dict(item))
            elif isinstance(item, list):
                result.append(self._process_list(item))
            else:
                result.append(item)
        return result
    
    def _standardize_structure(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        标准化特定字段的结构
        确保符合 LaTeX 模板的期望
        """
        standardized = data.copy()

        """
        标准化开源经历
        """
        if 'openSource' in standardized:
            standardized['openSource'] = self._standardize_opensource(
                standardized['openSource']
            )

        """
        标准化实习经历
        """
        if 'internships' in standardized:
            standardized['internships'] = self._standardize_experience_list(
                standardized['internships']
            )
            try:
                from backend.chunk_processor import _fix_internship_entries
            except ImportError:
                from chunk_processor import _fix_internship_entries
            standardized['internships'] = _fix_internship_entries(
                standardized['internships']
            )

        """
        标准化工作经历
        """
        if 'experience' in standardized:
            standardized['experience'] = self._standardize_experience_list(
                standardized['experience']
            )

        """
        标准化项目经验
        """
        if 'projects' in standardized:
            standardized['projects'] = self._standardize_projects(
                standardized['projects']
            )

        """
        标准化教育经历
        """
        if 'education' in standardized:
            standardized['education'] = self._standardize_education(
                standardized['education']
            )

        return standardized

    def _standardize_opensource(self, data: Any) -> List[Dict[str, Any]]:
        """
        标准化开源经历
        将AI返回的字段映射到编辑器期望的字段
        - AI返回: title, subtitle, items, repoUrl, date
        - Editor期望: name, role, repo, date, description
        """
        if not isinstance(data, list):
            data = [data]

        result = []
        for item in data:
            if isinstance(item, dict):
                standardized_item = {}

                # 处理字段映射
                for key, value in item.items():
                    key_lower = key.lower()

                    # 项目名称映射
                    if key_lower == 'title' or any(k in key_lower for k in ['项目', 'project', '名称', 'name']):
                        standardized_item['name'] = value
                    # 角色映射
                    elif key_lower == 'subtitle' or any(k in key_lower for k in ['角色', 'role', '描述', 'description']):
                        # 如果items为空，将subtitle作为description
                        if not item.get('items') and not item.get('description'):
                            standardized_item['description'] = value
                        else:
                            standardized_item['role'] = value
                    # 仓库链接映射
                    elif key_lower == 'repourl' or any(k in key_lower for k in ['repo', '仓库', 'url', 'link']):
                        standardized_item['repo'] = value
                    # 时间映射
                    elif key_lower == 'date' or any(k in key_lower for k in ['时间', 'duration', 'period']):
                        standardized_item['date'] = value
                    # 贡献列表：同时保留 items 数组和 description 文本
                    elif key_lower == 'items' or any(k in key_lower for k in ['贡献', 'contribution', 'item']):
                        if isinstance(value, list):
                            # 保留原始 items 数组（供前端 join('\n') 使用）
                            standardized_item['items'] = value
                            # 同时生成 HTML 格式的 description（用换行分隔）
                            standardized_item['description'] = '\n'.join(str(v) for v in value)
                        else:
                            standardized_item['description'] = str(value)
                    else:
                        # 未识别字段保留
                        standardized_item[key] = value

                # 确保有name字段
                if 'name' not in standardized_item:
                    standardized_item['name'] = '未命名项目'

                result.append(standardized_item)
            elif isinstance(item, str):
                # 简单字符串处理
                result.append({'name': item, 'description': ''})

        return result

    def _standardize_experience_list(self, data: Any) -> List[Dict[str, Any]]:
        """
        标准化经历列表（工作/实习）
        
        注意：保留 title/subtitle/date 字段给 internships，
        同时支持 company/position/duration 给 experience
        """
        if not isinstance(data, list):
            data = [data]
        
        result = []
        for item in data:
            if isinstance(item, dict):
                standardized_item = {}
                
                """
                提取标准字段
                """
                for key, value in item.items():
                    key_lower = key.lower()
                    key_compact = key_lower.replace('_', '').replace('-', '').replace(' ', '')
                    
                    # 保留 title/subtitle/date 字段（internships 格式）
                    if key_lower == 'title':
                        standardized_item['title'] = value
                    elif key_lower == 'subtitle':
                        standardized_item['subtitle'] = value
                    elif key_lower == 'date':
                        standardized_item['date'] = value
                    # 映射 company/position/duration（experience 格式）
                    elif key_compact in ['公司', 'company', '单位', '公司名称', 'companyname']:
                        standardized_item['company'] = value
                    elif key_compact in ['职位', 'position', '岗位', 'jobtitle']:
                        standardized_item['position'] = value
                    elif key_compact in ['时间', 'duration', 'period', '工作时间']:
                        standardized_item['duration'] = value
                    elif key_compact in ['地点', 'location', '地址']:
                        standardized_item['location'] = value
                    elif any(k in key_lower for k in ['成就', '职责', 'achievement', 'responsibility']):
                        if isinstance(value, list):
                            standardized_item['achievements'] = value
                        else:
                            standardized_item['achievements'] = [value]
                    else:
                        """
                        未识别的字段，保持原样
                        """
                        standardized_item[key] = value
                
                result.append(standardized_item)
            elif isinstance(item, str):
                """
                如果是字符串，尝试解析
                例如："实习经历一 - 某职位（2025.06 - 2025.10）"
                """
                parsed = self._parse_experience_string(item)
                result.append(parsed)
        
        return result
    
    def _standardize_projects(self, data: Any) -> List[Dict[str, Any]]:
        """
        标准化项目经验
        """
        if isinstance(data, dict):
            """
            如果是字典，转换为列表
            """
            result = []
            for project_name, project_data in data.items():
                project_item = {'name': project_name}
                
                if isinstance(project_data, dict):
                    project_item.update(project_data)
                elif isinstance(project_data, str):
                    project_item['description'] = project_data
                
                result.append(project_item)
            return result
        elif isinstance(data, list):
            return data
        else:
            return [{'description': str(data)}]
    
    def _standardize_education(self, data: Any) -> List[Dict[str, Any]]:
        """
        标准化教育经历
        """
        if not isinstance(data, list):
            data = [data]
        
        result = []
        for item in data:
            if isinstance(item, dict):
                standardized_item = {}
                
                for key, value in item.items():
                    key_lower = key.lower()
                    key_compact = key_lower.replace('_', '').replace('-', '').replace(' ', '')

                    # 处理 title 字段（学校名称），只接受明确字段，避免 schoolNameFontSize 被误判
                    if key_lower == 'title' or key_compact in ['学校', 'school', 'university', '院校', 'schoolname', 'universityname']:
                        standardized_item['title'] = value
                    # 处理 subtitle 字段（专业）
                    elif key_lower == 'subtitle' or key_compact in ['专业', 'major', '学科']:
                        standardized_item['subtitle'] = value
                    # 处理 degree 字段（学位）
                    elif key_lower == 'degree' or key_compact in ['学历', 'degree', '学位']:
                        standardized_item['degree'] = value
                    # 处理 date 字段（时间）
                    elif key_lower == 'date' or key_compact in ['时间', 'duration', 'date', '时间段', 'daterange']:
                        standardized_item['date'] = value
                    # 处理 details 字段
                    elif key_lower == 'details' or key_compact in ['描述', 'description', '详情', 'detail', '补充说明']:
                        standardized_item['details'] = value
                    else:
                        standardized_item[key] = value
                
                result.append(standardized_item)
            elif isinstance(item, str):
                result.append({'title': item})
        
        return result
    
    def _parse_experience_string(self, text: str) -> Dict[str, Any]:
        """
        解析字符串形式的经历
        
        例如：
        - "实习经历一 - 某职位（2025.06 - 2025.10）"
        - "腾讯 - 后端实习生（2024.06 - 2024.10）"
        """
        result = {}
        
        """
        尝试提取日期（括号内的内容）
        """
        date_pattern = r'[\uff08\(]([^\uff09\)]+)[\uff09\)]'
        date_match = re.search(date_pattern, text)
        
        if date_match:
            result['duration'] = date_match.group(1)
            """移除日期部分"""
            text_without_date = text[:date_match.start()].strip()
        else:
            text_without_date = text.strip()
        
        """
        尝试分割公司和职位（用 " - " 分隔）
        """
        if ' - ' in text_without_date:
            parts = text_without_date.split(' - ', 1)
            result['company'] = parts[0].strip()
            result['position'] = parts[1].strip()
        elif '-' in text_without_date:
            parts = text_without_date.split('-', 1)
            result['company'] = parts[0].strip()
            result['position'] = parts[1].strip()
        else:
            """
            没有分隔符，全部作为 title
            """
            result['title'] = text_without_date
        
        return result


"""
全局标准化器实例
"""
_normalizer = ResumeNormalizer()


def normalize_resume_json(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    标准化简历 JSON（通用入口）

    Args:
        data: 原始 JSON

    Returns:
        标准化后的 JSON
    """
    return _normalizer.normalize(data)
