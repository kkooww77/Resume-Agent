import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { confirmDialog } from '@/lib/confirm'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  getAllResumes,
  deleteResume as deleteResumeService,
  duplicateResume as duplicateResumeService,
  saveResume,
  setCurrentResumeId,
  getResume,
  updateResumeAlias as updateResumeAliasService,
  updateResumePinned as updateResumePinnedService,
  type SavedResume
} from '@/services/resumeStorage'
import { fetchPdfDownloadQuota, recordPdfDownload, renderPDF } from '@/services/api'
import { convertToBackendFormat } from '@/pages/Workspace/v2/utils/convertToBackend'
import { initialResumeData } from '@/pages/Workspace/v2/constants'
import { useNavigate } from 'react-router-dom'

// 简单的 UUID 生成
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useDashboardLogic = () => {
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  /** 是否处于多选模式 */
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  /** 选中的简历 ID 集合（用于批量删除） */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadResumes = async () => {
    setIsLoading(true)
    const list = await getAllResumes()
    // 置顶优先，然后按创建时间倒序排列
    list.sort((a, b) => {
      // 置顶的排在前面
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // 同级别按创建时间倒序
      return b.createdAt - a.createdAt
    })
    setResumes(list)
    setIsLoading(false)
  }

  useEffect(() => {
    ;(async () => {
      await loadResumes()
    })()
    
    // 监听 storage 事件，当其他页面修改 localStorage 时刷新
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'resume_resumes') {
        loadResumes()
      }
    }
    
    // 监听页面获得焦点时刷新
    const handleFocus = () => {
      loadResumes()
    }
    
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const createResume = () => {
    // 跳转到创建选择页面
    navigate('/create-new', { state: { from: '/my-resumes' } })
  };

  /** 删除单个简历 */
  const deleteResume = async (id: string) => {
    if (await confirmDialog({ title: '确定删除这份简历吗？', confirmText: '删除', danger: true })) {
      await deleteResumeService(id)
      // 同时从选中集合中移除
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await loadResumes()
    }
  }

  const duplicateResume = async (id: string) => {
    const newResume = await duplicateResumeService(id)
    if (newResume) {
      await loadResumes()
    }
  }

  const editResume = async (id: string) => {
    setCurrentResumeId(id)
    // 编辑器已合并为统一 /workspace，模板类型由简历数据 templateType 驱动，无需按类型分流路由
    navigate(`/workspace/${id}`)
  }

  const optimizeResume = (id: string) => {
    setCurrentResumeId(id)
    navigate(`/resume/optimize/${id}`)
  }

  const importJson = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // 简单的格式校验
        if (!data.basic || !data.education) {
          toast.error('无效的简历 JSON 格式')
          return
        }

        const newId = generateUUID()
        const newResume = { ...data, id: newId }
        await saveResume(newResume)
        await loadResumes()
      } catch (e) {
        console.error('Import failed', e)
        toast.error('导入失败')
      }
    }
    input.click()
  }

  /**
   * 切换单个简历的选中状态
   * @param id 简历 ID
   * @param selected 是否选中
   */
  const toggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  /**
   * 批量删除选中的简历
   * - 如果没有选中任何简历，给出友好提示
   * - 删除前弹出确认框
   * - 删除后清空选中状态并刷新列表
   */
  const batchDelete = useCallback(async () => {
    // 检查是否有选中的简历
    if (selectedIds.size === 0) {
      toast.error('请先选择要删除的简历')
      return
    }

    // 确认删除
    if (!(await confirmDialog({
      title: `确定删除选中的 ${selectedIds.size} 份简历吗？`,
      description: '此操作不可恢复。',
      confirmText: '删除',
      danger: true,
    }))) {
      return
    }

    // 执行批量删除
    for (const id of selectedIds) {
      await deleteResumeService(id)
    }

    // 清空选中状态
    setSelectedIds(new Set())

    // 刷新列表
    await loadResumes()
  }, [selectedIds])

  /** 批量下载进度文案（null 表示空闲） */
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null)

  const isHtmlResume = (r: SavedResume) =>
    r.templateType === 'html' || (r.data as any)?.templateType === 'html' || r.id.includes('_html_')

  const sanitizeFilename = (name: string) =>
    name.replace(/[\\/:*?"<>|\s]+/g, ' ').trim().slice(0, 60)

  /**
   * 批量下载选中的简历：逐份渲染 PDF 后打包 zip（多选 + 全选即「下载全部」）。
   */
  const batchDownload = useCallback(async (ids: string[]) => {
    if (downloadProgress) return

    if (ids.length === 0) {
      toast.error('请先选择要下载的简历')
      return
    }
    const targetIds = new Set(ids)
    const targets = resumes.filter(r => targetIds.has(r.id))
    if (targets.length === 0) {
      toast.error('还没有可下载的简历')
      return
    }

    const htmlSkipped = targets.filter(isHtmlResume)
    const latexTargets = targets.filter(r => !isHtmlResume(r))
    if (latexTargets.length === 0) {
      toast.error('选中的都是 HTML 模板简历，暂不支持批量导出 PDF，请进编辑器单独下载')
      return
    }

    // 下载额度预检（与单份下载同一记账口径：渲染预览不计次、真实下载才计）
    let quota
    try {
      quota = await fetchPdfDownloadQuota()
    } catch {
      toast.error('请先登录后再批量下载')
      return
    }
    if (!quota.unlimited && (quota.remaining ?? 0) < latexTargets.length) {
      toast.error(`下载额度不足：本次需 ${latexTargets.length} 次，剩余 ${quota.remaining ?? 0} 次`)
      return
    }

    const quotaNote = quota.unlimited ? '' : `，将消耗 ${latexTargets.length} 次下载额度（剩余 ${quota.remaining}）`
    const htmlNote = htmlSkipped.length ? `；${htmlSkipped.length} 份 HTML 模板简历暂不支持、将跳过` : ''
    if (!(await confirmDialog({
      title: `下载 ${latexTargets.length} 份简历？`,
      description: `将逐份渲染 PDF 并打包为 zip${quotaNote}${htmlNote}。`,
      confirmText: '开始下载',
    }))) {
      return
    }

    const zip = new JSZip()
    const failed: string[] = []
    const usedNames = new Set<string>()
    let done = 0
    for (const r of latexTargets) {
      done++
      setDownloadProgress(`渲染中 ${done}/${latexTargets.length}`)
      try {
        // 存储里的简历可能缺 menuSections/globalSettings（非工作台落库的来源），按工作台默认值补齐
        const raw = r.data as any
        const merged = {
          ...initialResumeData,
          ...raw,
          menuSections: raw?.menuSections?.length ? raw.menuSections : initialResumeData.menuSections,
          globalSettings: { ...initialResumeData.globalSettings, ...(raw?.globalSettings || {}) },
        }
        const backendData = convertToBackendFormat(merged)
        const blob = await renderPDF(backendData as any, false, (backendData as any).sectionOrder)
        const display = (r.data as any)?.basic?.name || r.name || '简历'
        const base = sanitizeFilename(r.alias ? `${display}-${r.alias}` : display) || '简历'
        let filename = `${base}.pdf`
        let n = 2
        while (usedNames.has(filename)) filename = `${base}-${n++}.pdf`
        usedNames.add(filename)
        zip.file(filename, blob)
      } catch (e) {
        console.error('批量下载：渲染失败', r.id, e)
        failed.push((r.data as any)?.basic?.name || r.name || r.id)
      }
    }

    const okCount = latexTargets.length - failed.length
    if (okCount === 0) {
      setDownloadProgress(null)
      toast.error('全部渲染失败，请稍后重试')
      return
    }

    setDownloadProgress('打包中…')
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, `我的简历-${new Date().toISOString().slice(0, 10)}.zip`)

    // 记账：每份成功下载的 PDF 记一次（不限次角色由后端直接跳过计数）
    if (!quota.unlimited) {
      for (let i = 0; i < okCount; i++) {
        try {
          await recordPdfDownload()
        } catch (e) {
          console.error('批量下载：额度记账失败', e)
          break
        }
      }
    }

    setDownloadProgress(null)
    const parts = [`已下载 ${okCount} 份`]
    if (htmlSkipped.length) parts.push(`跳过 HTML 模板 ${htmlSkipped.length} 份`)
    if (failed.length) parts.push(`失败 ${failed.length} 份（${failed.slice(0, 3).join('、')}${failed.length > 3 ? ' 等' : ''}）`)
    if (failed.length) {
      toast.error(parts.join('，'))
    } else {
      toast.success(parts.join('，'))
    }
  }, [resumes, downloadProgress])

  /**
   * 清空所有选中状态
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /**
   * 全选：选中当前列表全部简历
   */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(resumes.map(r => r.id)))
  }, [resumes])

  /**
   * 切换多选模式
   */
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => {
      if (prev) {
        // 退出多选模式时清空选中状态
        setSelectedIds(new Set())
      }
      return !prev
    })
  }, [])

  /**
   * 退出多选模式
   */
  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  /**
   * 更新简历备注/别名
   * @param id 简历 ID
   * @param alias 新的备注/别名
   */
  const updateAlias = useCallback(async (id: string, alias: string) => {
    await updateResumeAliasService(id, alias)
    // 更新本地状态，避免重新加载
    setResumes(prev => prev.map(r => 
      r.id === id ? { ...r, alias, updatedAt: Date.now() } : r
    ))
  }, [])

  /**
   * 切换简历置顶状态
   */
  const togglePin = useCallback(async (id: string) => {
    // 找到当前简历的 pinned 状态
    const resume = resumes.find(r => r.id === id)
    if (!resume) return
    const newPinned = !resume.pinned
    await updateResumePinnedService(id, newPinned)
    // 更新本地状态并重新排序
    setResumes(prev => {
      const updated = prev.map(r => 
        r.id === id ? { ...r, pinned: newPinned } : r
      )
      // 重新排序：置顶优先，然后按创建时间倒序
      updated.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.createdAt - a.createdAt
      })
      return updated
    })
  }, [resumes])

  return {
    resumes,
    isLoading,
    createResume,
    deleteResume,
    duplicateResume,
    editResume,
    optimizeResume,
    importJson,
    // 多选模式相关
    isMultiSelectMode,
    toggleMultiSelectMode,
    exitMultiSelectMode,
    selectedIds,
    toggleSelect,
    batchDelete,
    batchDownload,
    downloadProgress,
    clearSelection,
    selectAll,
    // 备注/别名
    updateAlias,
    // 置顶
    togglePin,
    // 刷新列表
    loadResumes
  }
}
