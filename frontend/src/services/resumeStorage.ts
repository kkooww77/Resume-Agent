import type { Resume } from '../types/resume'
import type { ResumeData } from '../pages/Workspace/v2/types'
import type {
  SavedResume,
  SavedResumeSummary,
  SavedResumeSummaryPage,
} from './storage/StorageAdapter'
import { LocalStorageAdapter } from './storage/LocalStorageAdapter'
import { DatabaseAdapter } from './storage/DatabaseAdapter'
import { stripPhotoFromSavedResume } from './storage/sanitizeResume'
import { syncResumesToDatabase } from './syncService'

const localAdapter = new LocalStorageAdapter()
const databaseAdapter = new DatabaseAdapter()

/** 登录用户的本地 UI 状态与离线缓存按身份隔离，不能和匿名草稿共用。 */
const CLOUD_CACHE_KEY_PREFIX = 'resume_cloud_cache:'
const CLOUD_SUMMARY_CACHE_KEY_PREFIX = 'resume_cloud_summary_cache:'
const PENDING_MIGRATION_KEY_PREFIX = 'resume_pending_migration:'
const PINNED_IDS_KEY_PREFIX = 'resume_pinned_ids:'
const CURRENT_ID_KEY_PREFIX = 'resume_current:'
type ResumeStorageSession = Readonly<{
  identity: string | null
  revision: number
  signal: AbortSignal
}>
type PendingMigrationBatch = Readonly<{
  id: string
  resumes: SavedResume[]
}>

let sessionRevision = 0
let sessionAbortController = new AbortController()
let activeSession: ResumeStorageSession = {
  identity: null,
  revision: sessionRevision,
  signal: sessionAbortController.signal,
}

class ResumeStorageSessionChangedError extends Error {
  constructor() {
    super('存储会话已切换，请重试')
    this.name = 'ResumeStorageSessionChangedError'
  }
}

/**
 * 由 AuthContext 在会话确认后设置。存储层只关心“本地还是云端”，
 * 不需要知道凭证来自 Legacy JWT 还是 BetterAuth Cookie。
 */
export function setResumeStorageSession(identity: string | null): void {
  if (activeSession.identity === identity) return
  sessionAbortController.abort()
  sessionAbortController = new AbortController()
  sessionRevision += 1
  activeSession = {
    identity,
    revision: sessionRevision,
    signal: sessionAbortController.signal,
  }
}

function captureSession(): ResumeStorageSession {
  return activeSession
}

function isCurrentSession(session: ResumeStorageSession): boolean {
  return session.revision === activeSession.revision
    && session.identity === activeSession.identity
}

function isAuthenticated(session: ResumeStorageSession = activeSession): boolean {
  return Boolean(session.identity)
}

function getAdapter(session: ResumeStorageSession) {
  return isAuthenticated(session) ? databaseAdapter : localAdapter
}

function getScopedKey(prefix: string, session: ResumeStorageSession): string | null {
  return session.identity ? `${prefix}${encodeURIComponent(session.identity)}` : null
}

function setScopedCurrentResumeId(session: ResumeStorageSession, id: string | null): void {
  const key = getScopedKey(CURRENT_ID_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return
  if (id) localStorage.setItem(key, id)
  else localStorage.removeItem(key)
}

function readCloudCache(session: ResumeStorageSession): SavedResume[] {
  const key = getScopedKey(CLOUD_CACHE_KEY_PREFIX, session)
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as SavedResume[]) : []
    return Array.isArray(parsed) ? parsed.map(stripPhotoFromSavedResume) : []
  } catch {
    return []
  }
}

function writeCloudCache(session: ResumeStorageSession, resumes: SavedResume[]): void {
  const key = getScopedKey(CLOUD_CACHE_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return
  try {
    localStorage.setItem(key, JSON.stringify(resumes.map(stripPhotoFromSavedResume)))
  } catch {
    // 缓存失败不影响云端主流程
  }
}

function toResumeSummary(resume: SavedResume): SavedResumeSummary {
  return {
    id: resume.id,
    name: resume.name,
    alias: resume.alias,
    pinned: resume.pinned,
    templateType: resume.templateType,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  }
}

function readCloudSummaryCache(session: ResumeStorageSession): SavedResumeSummary[] {
  const key = getScopedKey(CLOUD_SUMMARY_CACHE_KEY_PREFIX, session)
  if (!key) return []
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as SavedResumeSummary[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCloudSummaryCache(
  session: ResumeStorageSession,
  summaries: SavedResumeSummary[],
): void {
  const key = getScopedKey(CLOUD_SUMMARY_CACHE_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return
  try {
    localStorage.setItem(key, JSON.stringify(summaries))
  } catch {
    // 摘要缓存失败不影响云端主流程
  }
}

function updateCloudSummaryCache(
  session: ResumeStorageSession,
  update: (summaries: SavedResumeSummary[]) => SavedResumeSummary[],
): void {
  if (!isCurrentSession(session)) return
  writeCloudSummaryCache(session, update(readCloudSummaryCache(session)))
}

function mergeCloudSummaryCache(
  session: ResumeStorageSession,
  summaries: SavedResumeSummary[],
): void {
  updateCloudSummaryCache(session, cached => {
    const merged = new Map(cached.map(item => [item.id, item]))
    summaries.forEach(item => merged.set(item.id, item))
    return [...merged.values()]
  })
}

function readPendingMigration(session: ResumeStorageSession): PendingMigrationBatch | null {
  const key = getScopedKey(PENDING_MIGRATION_KEY_PREFIX, session)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingMigrationBatch>
    if (typeof parsed.id !== 'string' || !Array.isArray(parsed.resumes)) return null
    return {
      id: parsed.id,
      resumes: parsed.resumes.map(stripPhotoFromSavedResume),
    }
  } catch {
    return null
  }
}

function writePendingMigration(
  session: ResumeStorageSession,
  batch: PendingMigrationBatch,
): boolean {
  const key = getScopedKey(PENDING_MIGRATION_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return false
  try {
    localStorage.setItem(key, JSON.stringify({
      id: batch.id,
      resumes: batch.resumes.map(stripPhotoFromSavedResume),
    }))
    return true
  } catch {
    return false
  }
}

function clearPendingMigration(session: ResumeStorageSession, batchId: string): void {
  const key = getScopedKey(PENDING_MIGRATION_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return
  const current = readPendingMigration(session)
  if (current?.id !== batchId) return
  localStorage.removeItem(key)
}

function createMigrationBatch(resumes: SavedResume[]): PendingMigrationBatch {
  return {
    id: `migration_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    resumes,
  }
}

function updateCloudCache(
  session: ResumeStorageSession,
  update: (resumes: SavedResume[]) => SavedResume[],
): void {
  if (!isCurrentSession(session)) return
  writeCloudCache(session, update(readCloudCache(session)))
}

function getPinnedIds(session: ResumeStorageSession): Set<string> {
  const key = getScopedKey(PINNED_IDS_KEY_PREFIX, session)
  if (!key) return new Set()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function setPinnedIds(session: ResumeStorageSession, ids: Set<string>): void {
  const key = getScopedKey(PINNED_IDS_KEY_PREFIX, session)
  if (!key || !isCurrentSession(session)) return
  localStorage.setItem(key, JSON.stringify([...ids]))
}

export type { SavedResume, SavedResumeSummary, SavedResumeSummaryPage }

function sortResumeSummaries(a: SavedResumeSummary, b: SavedResumeSummary): number {
  if (a.pinned && !b.pinned) return -1
  if (!a.pinned && b.pinned) return 1
  if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt
  return a.id.localeCompare(b.id)
}

/**
 * 获取 Dashboard 列表摘要。
 * 登录用户走不含完整 data 的云端接口；匿名用户仍从本地数据生成摘要。
 */
export async function getResumeSummaryPage(
  offset: number,
  limit: number,
): Promise<SavedResumeSummaryPage> {
  const session = captureSession()
  const safeOffset = Math.max(0, Math.trunc(offset))
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)))

  if (isAuthenticated(session)) {
    const pinnedIds = [...getPinnedIds(session)]
    try {
      const page = await databaseAdapter.getResumeSummaryPage(
        safeOffset,
        safeLimit,
        pinnedIds,
        { signal: session.signal },
      )
      if (!isCurrentSession(session)) {
        return { items: [], total: 0, offset: safeOffset, limit: safeLimit }
      }
      mergeCloudSummaryCache(session, page.items)
      return page
    } catch (error) {
      if (!isCurrentSession(session)) {
        return { items: [], total: 0, offset: safeOffset, limit: safeLimit }
      }
      console.warn('[resumeStorage] getResumeSummaryPage failed, fallback to account cache:', error)
      const pinnedSet = new Set(pinnedIds)
      const cached = (
        readCloudSummaryCache(session).length > 0
          ? readCloudSummaryCache(session)
          : readCloudCache(session).map(toResumeSummary)
      )
        .map(item => ({ ...item, pinned: pinnedSet.has(item.id) }))
        .sort(sortResumeSummaries)
      return {
        items: cached.slice(safeOffset, safeOffset + safeLimit),
        total: cached.length,
        offset: safeOffset,
        limit: safeLimit,
      }
    }
  }

  const localResumes = await localAdapter.getAllResumes({ signal: session.signal })
  if (!isCurrentSession(session)) {
    return { items: [], total: 0, offset: safeOffset, limit: safeLimit }
  }
  const summaries = localResumes.map(toResumeSummary).sort(sortResumeSummaries)
  return {
    items: summaries.slice(safeOffset, safeOffset + safeLimit),
    total: summaries.length,
    offset: safeOffset,
    limit: safeLimit,
  }
}

/**
 * 获取所有保存的简历
 */
export async function getAllResumes(): Promise<SavedResume[]> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let list: SavedResume[] = []
  try {
    list = await adapter.getAllResumes({ signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return []
    if (!isAuthenticated(session)) throw error
    // 登录用户只回退到自己的离线缓存，绝不读取匿名/其他账号的简历。
    console.warn('[resumeStorage] getAllResumes failed, fallback to account cache:', error)
    list = readCloudCache(session)
  }
  if (!isCurrentSession(session)) return []
  if (isAuthenticated(session)) {
    writeCloudCache(session, list)
    // 登录用户：置顶状态存在 localStorage，合并到从数据库拉取的列表
    const pinnedIds = getPinnedIds(session)
    if (pinnedIds.size > 0) {
      list = list.map(r => ({ ...r, pinned: pinnedIds.has(r.id) }))
    }
  }
  return list
}

/**
 * 获取当前编辑的简历ID
 */
export function getCurrentResumeId(): string | null {
  const session = captureSession()
  if (isAuthenticated(session)) {
    const key = getScopedKey(CURRENT_ID_KEY_PREFIX, session)
    return key ? localStorage.getItem(key) : null
  }
  return localAdapter.getCurrentResumeId()
}

/**
 * 设置当前编辑的简历ID
 */
export function setCurrentResumeId(id: string | null) {
  const session = captureSession()
  if (isAuthenticated(session)) {
    setScopedCurrentResumeId(session, id)
    return
  }
  localAdapter.setCurrentResumeId(id)
}

/**
 * 获取指定简历
 */
export async function getResume(id: string): Promise<SavedResume | null> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let resume: SavedResume | null
  try {
    resume = await adapter.getResume(id, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return null
    if (!isAuthenticated(session)) throw error
    resume = readCloudCache(session).find(item => item.id === id) || null
  }
  if (!isCurrentSession(session)) return null
  if (resume && isAuthenticated(session)) {
    updateCloudCache(session, cached => [
      ...cached.filter(item => item.id !== resume!.id),
      resume!,
    ])
  }
  return isCurrentSession(session) ? resume : null
}

/**
 * 保存简历（新建或更新）
 * 支持 Resume 和 ResumeData 两种格式
 */
export async function saveResume(resume: Resume | ResumeData, id?: string): Promise<SavedResume> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let saved: SavedResume
  try {
    saved = await adapter.saveResume(resume, id, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) throw new ResumeStorageSessionChangedError()
    throw error
  }
  if (!isCurrentSession(session)) {
    throw new ResumeStorageSessionChangedError()
  }
  if (isAuthenticated(session)) {
    updateCloudCache(session, cached => [
      ...cached.filter(item => item.id !== saved.id),
      saved,
    ])
    updateCloudSummaryCache(session, cached => [
      ...cached.filter(item => item.id !== saved.id),
      toResumeSummary(saved),
    ])
    setScopedCurrentResumeId(session, saved.id)
  }
  return saved
}

/**
 * 删除简历
 */
export async function deleteResume(id: string): Promise<boolean> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let result: boolean
  try {
    result = await adapter.deleteResume(id, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return false
    throw error
  }
  if (!isCurrentSession(session)) return false
  if (result && isAuthenticated(session)) {
    updateCloudCache(session, cached => cached.filter(item => item.id !== id))
    updateCloudSummaryCache(session, cached => cached.filter(item => item.id !== id))
    if (getCurrentResumeId() === id) setScopedCurrentResumeId(session, null)
  }
  return result
}

/**
 * 重命名简历
 */
export async function renameResume(id: string, newName: string): Promise<boolean> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let result: boolean
  try {
    result = await adapter.renameResume(id, newName, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return false
    throw error
  }
  if (!isCurrentSession(session)) return false
  if (result && isAuthenticated(session)) {
    updateCloudCache(session, cached => cached.map(item => (
      item.id === id ? { ...item, name: newName, updatedAt: Date.now() } : item
    )))
    updateCloudSummaryCache(session, cached => cached.map(item => (
      item.id === id ? { ...item, name: newName, updatedAt: Date.now() } : item
    )))
  }
  return result
}

/**
 * 复制简历
 */
export async function duplicateResume(id: string): Promise<SavedResume | null> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let result: SavedResume | null
  try {
    result = await adapter.duplicateResume(id, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return null
    throw error
  }
  if (!isCurrentSession(session)) return null
  if (result && isAuthenticated(session)) {
    updateCloudCache(session, cached => [...cached, result])
    updateCloudSummaryCache(session, cached => [...cached, toResumeSummary(result!)])
    setScopedCurrentResumeId(session, result.id)
  }
  return result
}

/**
 * 更新简历备注/别名
 */
export async function updateResumeAlias(id: string, alias: string): Promise<boolean> {
  const session = captureSession()
  const adapter = getAdapter(session)
  let result: boolean
  try {
    result = await adapter.updateResumeAlias(id, alias, { signal: session.signal })
  } catch (error) {
    if (!isCurrentSession(session)) return false
    throw error
  }
  if (!isCurrentSession(session)) return false
  if (result && isAuthenticated(session)) {
    updateCloudCache(session, cached => cached.map(item => (
      item.id === id ? { ...item, alias, updatedAt: Date.now() } : item
    )))
    updateCloudSummaryCache(session, cached => cached.map(item => (
      item.id === id ? { ...item, alias, updatedAt: Date.now() } : item
    )))
  }
  return result
}

/**
 * 更新简历置顶状态
 * - 未登录：写入本地列表（localStorage）
 * - 已登录：写入当前账号的独立置顶列表，刷新后 getAllResumes 会合并
 */
export async function updateResumePinned(id: string, pinned: boolean): Promise<boolean> {
  const session = captureSession()
  if (isAuthenticated(session)) {
    const ids = getPinnedIds(session)
    if (pinned) ids.add(id)
    else ids.delete(id)
    setPinnedIds(session, ids)
    return true
  }
  return await localAdapter.updateResumePinned(id, pinned, { signal: session.signal })
}

/**
 * 登录后把匿名本地草稿迁移到当前云端账号。expectedIdentity 用来取消
 * 登录后延迟触发、但执行前已经切换账号的旧任务。
 */
export async function syncLocalResumesToCurrentAccount(
  expectedIdentity: string | null = captureSession().identity,
): Promise<SavedResume[]> {
  const session = captureSession()
  if (!expectedIdentity || session.identity !== expectedIdentity || !isAuthenticated(session)) {
    return []
  }

  let pendingBatch = readPendingMigration(session)
  const localResumes = await localAdapter.getAllResumes({ signal: session.signal })
  if (!isCurrentSession(session) || session.identity !== expectedIdentity) return []
  if (localResumes.length > 0) {
    const claimed = new Map((pendingBatch?.resumes || []).map(item => [item.id, item]))
    for (const item of localResumes) claimed.set(item.id, item)
    pendingBatch = createMigrationBatch([...claimed.values()])
    // 发请求前先把匿名池原子认领到当前账号；即使服务端已提交但响应丢失，
    // 后续账号也看不到这批数据，只有原账号会从 pending 仓重试。
    if (!writePendingMigration(session, pendingBatch)) {
      throw new Error('无法锁定待迁移的本地简历，请稍后重试')
    }
    localAdapter.clearAllResumes()
  }
  if (!pendingBatch || pendingBatch.resumes.length === 0) return []

  const merged = await syncResumesToDatabase(pendingBatch.resumes, { signal: session.signal })
  if (!isCurrentSession(session) || session.identity !== expectedIdentity) return []

  writeCloudCache(session, merged)
  writeCloudSummaryCache(session, merged.map(toResumeSummary))
  clearPendingMigration(session, pendingBatch.id)
  return merged
}
