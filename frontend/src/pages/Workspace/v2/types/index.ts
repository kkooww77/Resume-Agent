/**
 * Workspace v2 类型定义
 */

/**
 * 模块配置
 */
export interface MenuSection {
  id: string
  title: string
  icon: string
  enabled: boolean
  order: number
}

/**
 * 基本信息
 */
export interface BasicInfo {
  name: string
  title: string
  email: string
  phone: string
  location: string
  birthDate?: string
  /** 工作年限（下拉选择，如「3年经验」；空表示不展示） */
  workYears?: string
  employementStatus?: string
  blog?: string
  photo?: string
  photoOffsetX?: number  // 照片横向偏移（cm，正值向右）
  photoOffsetY?: number  // 照片纵向偏移（cm，正值向上）
  photoWidthCm?: number  // 照片宽度（cm）
  photoHeightCm?: number  // 照片高度（cm）
  icons?: Record<string, string>
  layout?: 'left' | 'center' | 'right'
  customFields?: CustomFieldType[]
  fieldOrder?: BasicFieldType[]
}

export interface BasicFieldType {
  id: string
  key: keyof BasicInfo
  label: string
  type?: 'date' | 'textarea' | 'text' | 'editor'
  visible: boolean
  custom?: boolean
}

export interface CustomFieldType {
  id: string
  label: string
  value: string
  icon?: string
  visible?: boolean
  custom?: boolean
}

/**
 * 教育经历
 */
export interface Education {
  id: string
  school: string
  major: string
  degree: string
  startDate: string
  endDate: string
  gpa?: string
  description?: string  // HTML 格式
  visible?: boolean
  schoolNameFontSize?: number  // 单条教育经历学校名称字号（px）
  schoolLogo?: string  // 学校 Logo key
  schoolLogoSize?: number  // 单条教育经历 Logo 大小（px）
}

/**
 * 工作经历/实习经历
 */
export interface Experience {
  id: string
  company: string
  position: string
  date: string
  details: string  // HTML 格式
  visible?: boolean
  companyNameFontSize?: number  // 单条经历公司名称字号（px），优先于全局设置
  companyLogo?: string  // 公司 Logo key，如 'bytedance'、'tencent'
  companyLogoSize?: number  // 单条经历 Logo 大小（px），优先于全局设置
}

/**
 * 开源经历
 */
export interface OpenSource {
  id: string
  name: string
  repo?: string
  role?: string
  date?: string
  description: string  // HTML 格式
  visible?: boolean
}

/**
 * 荣誉奖项
 */
export interface Award {
  id: string
  title: string
  issuer?: string
  date?: string
  description?: string
  visible?: boolean
}

/**
 * 项目经历
 */
export interface Project {
  id: string
  name: string
  role: string
  date: string
  description: string  // HTML 格式
  visible: boolean
  link?: string
}

/**
 * 自定义模块项
 */
export interface CustomItem {
  id: string
  title: string
  subtitle: string
  dateRange: string
  description: string  // HTML 格式
  visible: boolean
}

/**
 * 全局设置
 */
export interface GlobalSettings {
  themeColor?: string
  fontFamily?: string
  baseFontSize?: number
  pagePadding?: number
  paragraphSpacing?: number
  lineHeight?: number
  sectionSpacing?: number
  headerSize?: number
  subheaderSize?: number
  useIconMode?: boolean
  centerSubtitle?: boolean
  companyNameFontSize?: number  // 公司名称字号（px），默认跟随 item-title 15px
  companyLogoSize?: number  // 公司 Logo 大小（px），默认 20，范围 14-32
  experienceListType?: 'none' | 'unordered' | 'ordered'  // 工作经历列表类型：无列表、无序列表、有序列表
  awardsListType?: 'unordered' | 'ordered'  // 荣誉奖项列表类型：无序列表/有序列表
  openSourceRepoDisplay?: 'below' | 'inline' | 'icon'  // 开源经历仓库链接显示位置：下方 | 标题右侧 | 图标
  openSourceRepoLabel?: string  // 开源仓库链接前缀：'' 无前缀 | '仓库' | 'GitHub' | 自定义文字
  projectLinkDisplay?: 'below' | 'inline' | 'icon'  // 项目链接显示位置：下方 | 标题右侧 | 图标
  projectLinkLabel?: string  // 项目链接前缀：'' 无前缀 | '链接' | 'GitHub' | 自定义文字
  experienceGap?: number  // 经历项之间的间距（ex），默认 1，0 表示无间距
  projectExperienceGap?: number  // 项目经历项之间的间距（ex），默认 1，0 表示无间距
  // LaTeX 排版设置
  latexFontSize?: number  // LaTeX 字体大小: 8 - 12pt，步进 1pt
  latexMargin?: 'tight' | 'compact' | 'standard' | 'relaxed' | 'wide'  // 页面边距
  latexLineSpacing?: number  // 行间距: 0.9 - 1.5
  latexHeaderTopGapPx?: number  // 头部顶部空白（px，可为负）
  latexHeaderNameContactGapPx?: number  // 姓名与联系信息间距调整（px，可为负）
  latexHeaderBottomGapPx?: number  // 联系信息下方空白（px，可为负）
  birthDateDisplayMode?: 'birthDate' | 'age'  // 年龄渲染模式：显示出生年月 | 仅显示年龄
  /** @deprecated 改用 fieldLabelModes（每字段）；仅保留用于老简历迁移读取的兜底种子 */
  contactLabelMode?: 'icon' | 'text' | 'none'
  /** Builder 模板市场页的排版设置随简历持久化;结构由 pages/Builder/settings.ts 定义并在读取时校验合并 */
  builderSettings?: Record<string, unknown>
  // 每字段显示样式，key: title/birthDate/email/phone/location/blog；缺失时回退 contactLabelMode→'icon'
  fieldLabelModes?: Record<string, FieldLabelMode>
}

/** 基本信息字段前缀样式：icon（📧值）| text（邮箱：值）| none（仅值） */
export type FieldLabelMode = 'icon' | 'text' | 'none'

/**
 * 完整简历数据
 */
export interface ResumeData {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  templateId: string | null
  templateType?: 'latex' | 'html'  // 模板类型：latex 或 html，默认 latex
  alias?: string  // 备注/别名
  basic: BasicInfo
  education: Education[]
  workExperience?: Experience[]
  experience: Experience[]
  projects: Project[]
  openSource: OpenSource[]
  awards: Award[]
  customData: Record<string, CustomItem[]>
  selfEvaluation: string  // HTML 格式
  skillContent: string  // HTML 格式
  activeSection: string
  draggingProjectId: string | null
  menuSections: MenuSection[]
  globalSettings: GlobalSettings
}

/**
 * 默认模块列表
 */
export const DEFAULT_MENU_SECTIONS: MenuSection[] = [
  { id: 'basic', title: '基本信息', icon: '👤', enabled: true, order: 0 },
  { id: 'education', title: '教育经历', icon: '🎓', enabled: true, order: 1 },
  { id: 'workExperience', title: '工作经历', icon: '🏢', enabled: true, order: 2 },
  { id: 'experience', title: '实习经历', icon: '💼', enabled: true, order: 3 },
  { id: 'projects', title: '项目经历', icon: '🚀', enabled: true, order: 4 },
  { id: 'openSource', title: '开源经历', icon: '🔗', enabled: true, order: 5 },
  { id: 'skills', title: '专业技能', icon: '⚡', enabled: true, order: 6 },
  { id: 'awards', title: '荣誉奖项', icon: '😄', enabled: true, order: 7 },
  { id: 'selfEvaluation', title: '自我评价', icon: '📝', enabled: true, order: 8 },
  { id: 'custom_research', title: '竞赛科研', icon: '🔬', enabled: true, order: 9 },
]

/**
 * 默认基本信息字段顺序
 */
export const DEFAULT_FIELD_ORDER: BasicFieldType[] = [
  { id: '1', key: 'name', label: '姓名', type: 'text', visible: true },
  { id: '2', key: 'title', label: '职位', type: 'text', visible: true },
  { id: '3', key: 'employementStatus', label: '状态', type: 'text', visible: true },
  { id: '4', key: 'birthDate', label: '生日', type: 'date', visible: true },
  { id: '5', key: 'email', label: '邮箱', type: 'text', visible: true },
  { id: '6', key: 'phone', label: '电话', type: 'text', visible: true },
  { id: '7', key: 'location', label: '地址', type: 'text', visible: true },
]
