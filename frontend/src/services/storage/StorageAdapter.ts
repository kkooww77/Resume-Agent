import type { Resume } from '@/types/resume'
import type { ResumeData } from '@/pages/Workspace/v2/types'

export type TemplateType = 'html' | 'latex'

export interface SavedResume {
  id: string
  name: string
  alias?: string  // 备注/别名，用于标识简历用途（如"投递腾讯"）
  pinned?: boolean  // 是否置顶
  templateType?: TemplateType  // 模板类型：html 或 latex
  data: Resume | ResumeData
  createdAt: number
  updatedAt: number
}

/** 列表卡片所需的轻量摘要，不携带完整简历 data。 */
export type SavedResumeSummary = Omit<SavedResume, 'data'>

export interface SavedResumeSummaryPage {
  items: SavedResumeSummary[]
  total: number
  offset: number
  limit: number
}

export type StorageOperationContext = Readonly<{
  signal?: AbortSignal
}>

export interface StorageAdapter {
  getAllResumes(context?: StorageOperationContext): Promise<SavedResume[]>
  getCurrentResumeId(): string | null
  setCurrentResumeId(id: string | null): void
  getResume(id: string, context?: StorageOperationContext): Promise<SavedResume | null>
  saveResume(resume: Resume | ResumeData, id?: string, context?: StorageOperationContext): Promise<SavedResume>
  deleteResume(id: string, context?: StorageOperationContext): Promise<boolean>
  renameResume(id: string, newName: string, context?: StorageOperationContext): Promise<boolean>
  duplicateResume(id: string, context?: StorageOperationContext): Promise<SavedResume | null>
  updateResumeAlias(id: string, alias: string, context?: StorageOperationContext): Promise<boolean>
  updateResumePinned(id: string, pinned: boolean, context?: StorageOperationContext): Promise<boolean>
}
