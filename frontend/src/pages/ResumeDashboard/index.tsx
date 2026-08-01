import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from './components/Header'
import { CreateCard } from './components/CreateCard'
import { ResumeCard } from './components/ResumeCard'
import { useDashboardLogic } from './hooks/useDashboardLogic'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { AlertCircle, Settings } from './components/Icons'
import { Button } from './components/ui/button'
import WorkspaceLayout from '@/pages/WorkspaceLayout'
import { useAuth } from '@/contexts/AuthContext'
import AIImportModal from '@/pages/Workspace/v2/shared/AIImportModal'
import { saveResume, setCurrentResumeId } from '@/services/resumeStorage'
import type { ResumeData } from '@/pages/Workspace/v2/types'
import { matchCompanyLogo } from '@/pages/Workspace/v2/constants/companyLogos'
import { highlightsToHtml, groupedHighlightsToHtml, skillsToHtml } from '@/utils/resumeRichtext'

const ResumeDashboard = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user, logout, openModal } = useAuth()
  const {
    resumes,
    createResume,
    deleteResume,
    duplicateResume,
    editResume,
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
  } = useDashboardLogic()

  // 登录时数据保存到数据库，未登录时保存到本地存储
  const hasConfiguredFolder = true // 总是有存储配置（本地或云端）

  // AI 智能导入相关状态
  const [aiModalOpen, setAiModalOpen] = useState(false)

  // 打开 AI 导入弹窗
  const handleOpenAIImport = useCallback(() => {
    setAiModalOpen(true)
  }, [])

  // 从 /create-new 带 ?openAIImport=1 进入时自动打开 AI 导入弹窗
  useEffect(() => {
    if (searchParams.get('openAIImport') === '1') {
      setAiModalOpen(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('openAIImport')
        return next
      }, { replace: true })
    }
  }, [])

  // AI 解析完成后，创建新简历并跳转到工作区
  const handleAISave = useCallback(async (data: any) => {
    // 将 AI 解析的数据转换为 ResumeData 格式
    const newResumeData: ResumeData = {
      basic: {
        name: data.name || '',
        title: data.objective || '',
        email: data.contact?.email || '',
        phone: data.contact?.phone || '',
        location: data.contact?.location || '',
      },
      education: data.education?.map((e: any, i: number) => {
        let startDate = ''
        let endDate = ''
        if (e.date) {
          const dateStr = e.date.trim()
          const dateMatch = dateStr.match(/^(.+?)\s*[-–~]\s*(.+)$/)
          if (dateMatch) {
            startDate = dateMatch[1].trim()
            endDate = dateMatch[2].trim()
          } else {
            startDate = dateStr
          }
        }
        return {
          id: `edu_${Date.now()}_${i}`,
          school: e.title || '',
          major: e.subtitle || '',
          degree: e.degree || '',
          startDate,
          endDate,
          // 补充说明是富文本编辑器字段，统一转成无序列表 HTML（与 Agent 编辑链路一致）
          description: e.details?.length > 0 ? highlightsToHtml(e.details) : '',
          visible: true,
        }
      }) || [],
      experience: data.internships?.map((e: any, i: number) => {
        const raw = (e.title || '').trim()
        const company = !raw ? '' : raw.startsWith('**') && raw.endsWith('**') ? raw : `**${raw}**`
        const logoKey = matchCompanyLogo(e.title || '')
        return {
          id: `exp_${Date.now()}_${i}`,
          company,
          position: e.subtitle || '',
          date: e.date || '',
          details: highlightsToHtml(e.highlights),
          visible: true,
          ...(logoKey ? { companyLogo: logoKey } : {}),
        }
      }) || [],
      projects: data.projects?.map((p: any, i: number) => {
        let description = p.description || ''
        if (p.highlights && p.highlights.length > 0) {
          const highlightsList = highlightsToHtml(p.highlights)
          description = description ? description + highlightsList : highlightsList
        }
        description = description.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        return {
          id: `proj_${Date.now()}_${i}`,
          name: p.title || '',
          role: p.subtitle || '',
          date: p.date || '',
          description: description,
          visible: true,
        }
      }) || [],
      openSource: data.openSource?.map((o: any, i: number) => ({
        id: `os_${Date.now()}_${i}`,
        name: o.title || o.name || '',
        role: o.subtitle || o.role || '',
        repo: o.repoUrl || o.repo || '',
        date: o.date || '',
        description: o.items?.length > 0 ? groupedHighlightsToHtml(o.items) : o.description || '',
        visible: true,
      })) || [],
      awards: data.awards?.map((a: any, i: number) => ({
        id: `award_${Date.now()}_${i}`,
        title: a.title || '',
        issuer: a.issuer || '',
        date: a.date || '',
        description: a.description || '',
        visible: true,
      })) || [],
      selfEvaluation: typeof data.summary === 'string' && data.summary.trim()
        ? `<p>${data.summary}</p>`
        : '',
      // 专业技能统一转成无序列表 HTML（与 Agent 编辑链路一致）
      skillContent: skillsToHtml(data.skills),
      templateType: 'latex',
    }

    // 保存为新简历
    const resumeId = `resume_latex_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const saved = await saveResume(newResumeData, resumeId)
    setCurrentResumeId(saved.id)

    // 关闭弹窗
    setAiModalOpen(false)

    // 刷新列表
    await loadResumes()

    // 跳转到统一工作区编辑
    navigate(`/workspace/${saved.id}`)
  }, [navigate, loadResumes])

  return (
    <WorkspaceLayout>
      <div className="h-full overflow-y-auto bg-[#F6F3EC] fresh:bg-slate-50 relative [background-image:linear-gradient(rgba(10,10,10,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,10,0.04)_1px,transparent_1px)] fresh:[background-image:none] [background-size:48px_48px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-[1440px] mx-auto relative z-10 p-4 md:p-8"
        >
          {/* 方框(照搬 Builder Dashboard 外层容器):黑边 + 硬阴影,包裹全部内容;
              min-h 用 vh 直接算(不依赖父级 flex/百分比继承链,避免嵌套 flex-col 导致高度塌陷),
              内容少时方框仍撑满可视区域,不再露出画布背景 */}
          <div className="border border-black fresh:border-slate-200 dark:border-white bg-[#F6F3EC] fresh:bg-white dark:bg-[#1C1C1C] shadow-[8px_8px_0px_0px_#000000] fresh:shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-[8px_8px_0px_0px_#ffffff] min-h-[calc(100vh-2rem)] space-y-6 p-6 rounded-none fresh:rounded-xl">
          <motion.div
            className="flex w-full items-center justify-center"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {hasConfiguredFolder && (
              <Alert className="mb-0 max-w-2xl py-3">
                <AlertDescription className="flex items-center justify-center gap-3 fresh:font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-700 animate-pulse fresh:animate-none" />
                    <span className="text-sm font-mono fresh:font-sans font-bold fresh:font-medium uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-black fresh:text-slate-600">
                      {isAuthenticated
                        ? '数据已同步至云端'
                        : '数据保存在本地'}
                    </span>
                  </div>
                  {!isAuthenticated && (
                    <button
                      className="text-sm font-mono fresh:font-sans font-bold fresh:font-medium uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-[#3367D6] hover:underline underline-offset-4"
                      onClick={() => openModal('login')}
                    >
                      立即登录同步
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </motion.div>

          {/* 顶部标题栏 - 传入多选模式相关 props */}
          <Header
            onImport={importJson}
            onCreate={createResume}
            onAIImport={handleOpenAIImport}
            selectedCount={selectedIds.size}
            onBatchDelete={batchDelete}
            onBatchDownload={() => batchDownload(Array.from(selectedIds))}
            downloadProgress={downloadProgress}
            totalCount={resumes.length}
            isMultiSelectMode={isMultiSelectMode}
            onToggleMultiSelectMode={toggleMultiSelectMode}
            onExitMultiSelectMode={exitMultiSelectMode}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
          />

          <motion.div
            className="flex-1 w-full pb-16"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <CreateCard onClick={createResume} />

              <AnimatePresence>
                {resumes.map((resume, idx) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    index={idx + 1}
                    onEdit={editResume}
                    onDelete={deleteResume}
                    onDuplicate={duplicateResume}
                    // 多选模式相关
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedIds.has(resume.id)}
                    onSelectChange={toggleSelect}
                    // 备注/别名
                    onAliasChange={updateAlias}
                    // 置顶
                    onTogglePin={togglePin}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
          </div>
        </motion.div>
      </div>
      {/* AI 智能导入弹窗 */}
      <AIImportModal
        isOpen={aiModalOpen}
        sectionType="all"
        sectionTitle="AI 智能导入"
        onClose={() => setAiModalOpen(false)}
        onSave={handleAISave}
      />
    </WorkspaceLayout>
  )
}

export default ResumeDashboard
