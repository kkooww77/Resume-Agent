/**
 * 将前端 ResumeData 转换为后端需要的格式
 */
import type { ResumeData, CustomItem } from '../types'
import { resolveEmploymentStatusForRender } from './birthDateDisplay'
import { stripHtmlTags } from './textUtils'

export interface BackendResumeData {
  name: string
  birthDate?: string
  photo?: string
  photoOffsetX?: number
  photoOffsetY?: number
  photoWidthCm?: number
  photoHeightCm?: number
  contact: {
    phone: string
    email: string
    location: string
  }
  employementStatus?: string
  /** 工作年限（如「3年经验」），后端拼进 contactInfo 的状态位 */
  workYears?: string
  blog?: string
  objective: string
  summary?: string
  skillContent?: string  // HTML 格式的专业技能内容
  skills: { category: string; details: string }[]
  internships: {
    title: string
    subtitle: string
    date: string
    highlights: string[]
    companyNameFontSize?: number  // 单条经历公司名称字号（px）
    logo?: string  // 公司 Logo key
    logoSize?: number  // 单条经历 Logo 大小（px）
  }[]
  /** 工作经历（独立板块，与实习经历并行）。结构与 internships 一致，后端
   *  generate_section_work_experience 复用同款渲染（Logo/列表类型/间距全一致）。 */
  workExperience?: {
    title: string
    subtitle: string
    date: string
    highlights: string[]
    companyNameFontSize?: number
    logo?: string
    logoSize?: number
  }[]
  projects: {
    title: string
    subtitle: string
    date: string
    highlights: string[]
    link?: string
  }[]
  open_source: {
    title: string
    subtitle: string
    repoUrl: string
    date: string
    items: string[]
  }[]
  awards: {
    title: string
    issuer: string
    date: string
    description: string
  }[]
  education: {
    title: string
    subtitle: string
    degree: string
    date: string
    details: string[]
    schoolNameFontSize?: number  // 单条教育经历学校名称字号（px）
    logo?: string  // 学校 Logo key
    logoSize?: number  // 单条教育经历 Logo 大小（px）
  }[]
  sectionOrder: string[]
  sectionTitles?: Record<string, string>
  customData?: Record<string, CustomItem[]>
  globalSettings?: {
    experienceListType?: 'none' | 'unordered' | 'ordered'
    [key: string]: any
  }
}

export function convertToBackendFormat(data: ResumeData): BackendResumeData {
  const sectionIdMapping: Record<string, string> = {
    skills: 'skills',
    experience: 'internships',
    // 工作经历保持自身 id：后端 SECTION_GENERATORS 有同名生成器，
    // 不能并进 internships（否则两个板块会挤成一段、标题串台）
    workExperience: 'workExperience',
    projects: 'projects',
    openSource: 'open_source',
    selfEvaluation: 'summary',
    awards: 'awards',
    education: 'education',
  }

  const sectionTitles = data.menuSections.reduce<Record<string, string>>((acc, section) => {
    if (!section.title?.trim()) return acc
    const mappedId = sectionIdMapping[section.id] || section.id
    acc[section.id] = section.title.trim()
    acc[mappedId] = section.title.trim()
    if (section.id === 'openSource') {
      acc.opensource = section.title.trim()
    }
    return acc
  }, {})

  const birthDateDisplayMode = data.globalSettings?.birthDateDisplayMode || 'birthDate'
  const employementStatus = resolveEmploymentStatusForRender(
    data.basic.employementStatus,
    data.basic.birthDate,
    birthDateDisplayMode
  )

  return {
    name: data.basic.name,
    ...(data.basic.birthDate ? { birthDate: data.basic.birthDate } : {}),
    ...(data.basic.photo ? { photo: data.basic.photo } : {}),
    ...(typeof data.basic.photoOffsetX === 'number' ? { photoOffsetX: data.basic.photoOffsetX } : {}),
    ...(typeof data.basic.photoOffsetY === 'number' ? { photoOffsetY: data.basic.photoOffsetY } : {}),
    ...(typeof data.basic.photoWidthCm === 'number' ? { photoWidthCm: data.basic.photoWidthCm } : {}),
    ...(typeof data.basic.photoHeightCm === 'number' ? { photoHeightCm: data.basic.photoHeightCm } : {}),
    contact: {
      phone: data.basic.phone,
      email: data.basic.email,
      location: data.basic.location,
    },
    ...(employementStatus ? { employementStatus } : {}),
    ...(data.basic.workYears ? { workYears: data.basic.workYears } : {}),
    ...(data.basic.blog ? { blog: data.basic.blog } : {}),
    objective: data.basic.title,
    summary: data.selfEvaluation || '',
    skillContent: data.skillContent || '',  // 直接传递 HTML 内容
    skills: data.skillContent ? [{ category: '', details: data.skillContent }] : [],  // 兼容旧格式
    internships: data.experience.filter(e => e.visible !== false).map((e) => ({
      title: stripHtmlTags(e.company),
      subtitle: stripHtmlTags(e.position),
      date: e.date,
      highlights: [e.details],
      ...(e.companyNameFontSize ? { companyNameFontSize: e.companyNameFontSize } : {}),
      ...(e.companyLogo ? { logo: e.companyLogo } : {}),
      ...(e.companyLogoSize ? { logoSize: e.companyLogoSize } : {}),
    })),
    // 工作经历：与实习经历同款字段映射（老简历无此字段则为空数组，后端跳过该 section）
    workExperience: (data.workExperience || []).filter(e => e.visible !== false).map((e) => ({
      title: stripHtmlTags(e.company),
      subtitle: stripHtmlTags(e.position),
      date: e.date,
      highlights: [e.details],
      ...(e.companyNameFontSize ? { companyNameFontSize: e.companyNameFontSize } : {}),
      ...(e.companyLogo ? { logo: e.companyLogo } : {}),
      ...(e.companyLogoSize ? { logoSize: e.companyLogoSize } : {}),
    })),
    projects: data.projects.filter(p => p.visible !== false).map((p) => ({
      title: stripHtmlTags(p.name),
      subtitle: stripHtmlTags(p.role),
      date: p.date,
      highlights: [p.description],
      ...(p.link?.trim() ? { link: p.link.trim() } : {}),
    })),
    open_source: (data.openSource || []).filter(o => o.visible !== false).map((o) => ({
      title: stripHtmlTags(o.name),
      subtitle: stripHtmlTags(o.role || ''),
      repoUrl: o.repo || '',
      date: o.date || '',
      items: [o.description],
    })),
    awards: (data.awards || []).filter(a => a.visible !== false).map((a) => ({
      title: stripHtmlTags(a.title),
      issuer: stripHtmlTags(a.issuer || ''),
      date: a.date || '',
      description: a.description || '',
    })),
    education: data.education.filter(e => e.visible !== false).map((e) => ({
      title: stripHtmlTags(e.school),
      subtitle: stripHtmlTags(e.major),
      degree: stripHtmlTags(e.degree),
      date: e.endDate ? `${e.startDate} - ${e.endDate}` : e.startDate,
      details: e.description ? [e.description] : [],
      ...(e.schoolNameFontSize ? { schoolNameFontSize: e.schoolNameFontSize } : {}),
      ...(e.schoolLogo ? { logo: e.schoolLogo } : {}),
      ...(e.schoolLogoSize ? { logoSize: e.schoolLogoSize } : {}),
    })),
    sectionOrder: data.menuSections
      .filter((s) => s.enabled && s.id !== 'basic')
      .map((s) => sectionIdMapping[s.id] || s.id),
    sectionTitles,
    customData: Object.entries(data.customData || {}).reduce<Record<string, CustomItem[]>>((acc, [sectionId, items]) => {
      const list = Array.isArray(items) ? items : []
      acc[sectionId] = list
        .filter((item) => item.visible !== false)
        .map((item) => ({
          id: item.id,
          title: stripHtmlTags(item.title || ''),
          subtitle: stripHtmlTags(item.subtitle || ''),
          dateRange: item.dateRange || '',
          description: item.description || '',
          visible: item.visible !== false,
        }))
      return acc
    }, {}),
    globalSettings: data.globalSettings,  // 传递全局设置
  }
}
