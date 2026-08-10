import axios from 'axios'
import { getAuthHeaders } from '@/lib/authHeaders'
import { getApiBaseUrl } from '@/lib/runtimeEnv'
import type { Resume } from '@/types/resume'
import type { ResumeData } from '@/pages/Workspace/v2/types'
import type {
  SavedResume,
  SavedResumeSummary,
  SavedResumeSummaryPage,
  StorageAdapter,
  StorageOperationContext,
} from './StorageAdapter'

// withCredentials:configureAuthWebRequests 只 patch 全局 axios/fetch,
// axios.create 自建实例吃不到——走 auth-web(3000)代理时 BetterAuth cookie
// 不随行,简历 CRUD 全部 401 并静默回退 local,造成"Dashboard 删了、数据库
// 还在"的幽灵数据(2026-07-13 实测)。代理 CORS 已确认允许凭证。
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  withCredentials: true,
})

// 注意:不做"401 就删 auth_token"——适配器的偶发 401(cookie 未随行/瞬时
// 网络)不能反手清掉用户会话凭证,否则适配器被永久打回 local 模式,本地与
// 数据库从此分叉。真正的登出由 AuthContext 统一管理。
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()
  return config
})

function toSavedResume(payload: any): SavedResume {
  // 尝试从 payload 或 data 中获取 templateType
  const templateType = payload.template_type || payload.data?.templateType || 'latex'
  return {
    id: payload.id,
    name: payload.name,
    alias: payload.alias || undefined,  // 确保 alias 被正确解析
    pinned: Boolean(payload.pinned),
    templateType,
    data: payload.data,
    createdAt: payload.created_at ? Date.parse(payload.created_at) : Date.now(),
    updatedAt: payload.updated_at ? Date.parse(payload.updated_at) : Date.now()
  }
}

function toSavedResumeSummary(payload: any): SavedResumeSummary {
  return {
    id: payload.id,
    name: payload.name,
    alias: payload.alias || undefined,
    pinned: Boolean(payload.pinned),
    createdAt: payload.created_at ? Date.parse(payload.created_at) : Date.now(),
    updatedAt: payload.updated_at ? Date.parse(payload.updated_at) : Date.now(),
  }
}

export class DatabaseAdapter implements StorageAdapter {
  async getResumeSummaryPage(
    offset: number,
    limit: number,
    pinnedIds: string[],
    context?: StorageOperationContext,
  ): Promise<SavedResumeSummaryPage> {
    const { data } = await apiClient.get('/api/resumes/summaries', {
      headers: getAuthHeaders(),
      signal: context?.signal,
      params: {
        offset,
        limit,
        ...(pinnedIds.length > 0 ? { pinned_ids: pinnedIds.slice(0, 100).join(',') } : {}),
      },
    })
    const items = Array.isArray(data?.items) ? data.items.map(toSavedResumeSummary) : []
    return {
      items,
      total: Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length,
      offset: Number.isFinite(Number(data?.offset)) ? Number(data.offset) : offset,
      limit: Number.isFinite(Number(data?.limit)) ? Number(data.limit) : limit,
    }
  }

  async getAllResumes(context?: StorageOperationContext): Promise<SavedResume[]> {
    const { data } = await apiClient.get('/api/resumes', {
      headers: getAuthHeaders(),
      signal: context?.signal,
    })
    return Array.isArray(data) ? data.map(toSavedResume) : []
  }

  getCurrentResumeId(): string | null {
    // 当前编辑项属于前端会话 UI 状态，由 resumeStorage 按账号隔离管理。
    return null
  }

  setCurrentResumeId(_id: string | null): void {
    // StorageAdapter 兼容方法；数据库适配器不写浏览器全局状态。
  }

  async getResume(id: string, context?: StorageOperationContext): Promise<SavedResume | null> {
    try {
      const { data } = await apiClient.get(`/api/resumes/${id}`, {
        headers: getAuthHeaders(),
        signal: context?.signal,
      })
      return toSavedResume(data)
    } catch (error: any) {
      if (error?.response?.status === 404) return null
      throw error
    }
  }

  async saveResume(
    resume: Resume | ResumeData,
    id?: string,
    context?: StorageOperationContext,
  ): Promise<SavedResume> {
    const name = (resume as any).basic?.name || (resume as any).name || '未命名简历'
    // 从 ResumeData 中提取 templateType，默认为 'latex'
    const templateType = (resume as ResumeData).templateType || 'latex'
    try {
      if (id) {
        try {
          const { data } = await apiClient.put(
            `/api/resumes/${id}`,
            { id, name, template_type: templateType, data: resume },
            { headers: getAuthHeaders(), signal: context?.signal }
          )
          return toSavedResume(data)
        } catch (error: any) {
          const status = error?.response?.status
          if (status !== 404) {
            throw error
          }
          // 如果不存在则创建（允许携带自定义 id）
          const { data } = await apiClient.post(
            '/api/resumes',
            { id, name, template_type: templateType, data: resume },
            { headers: getAuthHeaders(), signal: context?.signal }
          )
          return toSavedResume(data)
        }
      }

      const { data } = await apiClient.post(
        '/api/resumes',
        { name, template_type: templateType, data: resume },
        { headers: getAuthHeaders(), signal: context?.signal }
      )
      return toSavedResume(data)
    } catch (error: any) {
      console.error('保存到数据库失败:', error)
      // 如果保存失败，抛出错误以便上层处理
      throw new Error(error?.response?.data?.detail || error?.message || '保存失败')
    }
  }

  async deleteResume(id: string, context?: StorageOperationContext): Promise<boolean> {
    try {
      await apiClient.delete(`/api/resumes/${id}`, {
        headers: getAuthHeaders(),
        signal: context?.signal,
      })
      return true
    } catch (error: any) {
      if (error?.response?.status === 404) return false
      throw error
    }
  }

  async renameResume(
    id: string,
    newName: string,
    context?: StorageOperationContext,
  ): Promise<boolean> {
    const resume = await this.getResume(id, context)
    if (!resume) return false
    await apiClient.put(
      `/api/resumes/${id}`,
      { id, name: newName, data: resume.data },
      { headers: getAuthHeaders(), signal: context?.signal }
    )
    return true
  }

  async duplicateResume(id: string, context?: StorageOperationContext): Promise<SavedResume | null> {
    const original = await this.getResume(id, context)
    if (!original) return null
    const copied = JSON.parse(JSON.stringify(original.data)) as Resume | ResumeData
    const copiedName = `${original.name} (副本)`
    if ('basic' in copied && copied.basic) copied.basic.name = copiedName
    else (copied as Resume).name = copiedName
    return this.saveResume(copied, undefined, context)
  }

  async updateResumeAlias(
    id: string,
    alias: string,
    context?: StorageOperationContext,
  ): Promise<boolean> {
    const resume = await this.getResume(id, context)
    if (!resume) return false
    try {
      await apiClient.put(
        `/api/resumes/${id}`,
        { id, name: resume.name, alias, data: resume.data },
        { headers: getAuthHeaders(), signal: context?.signal }
      )
      return true
    } catch (error: any) {
      if (error?.response?.status === 404) return false
      throw error
    }
  }

  async updateResumePinned(
    id: string,
    pinned: boolean,
    _context?: StorageOperationContext,
  ): Promise<boolean> {
    // 置顶状态仅存储在本地，不同步到数据库
    // 通过 LocalStorageAdapter 实现
    return false
  }
}
