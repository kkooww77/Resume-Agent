import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, FilePlus2, FileText, MessageSquare, Upload } from 'lucide-react'
import { getAllResumes } from '@/services/resumeStorage'
import type { SavedResume } from '@/services/storage/StorageAdapter'

interface ResumeSelectorProps {
  onSelect: (resume: SavedResume) => void
  onCreateResume?: () => void
  onImportResume?: () => void
  onFillCreatePrompt?: () => void
  onCancel?: () => void
  onLayoutChange?: () => void
  /** 打开时的初始步骤，默认入口卡片；传 'existing' 直达已有简历列表 */
  initialStep?: 'entry' | 'existing'
}

type SelectorStep = 'entry' | 'existing'
const RESUMES_PER_PAGE = 3

export const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  onSelect,
  onCreateResume,
  onImportResume,
  onFillCreatePrompt,
  onCancel,
  onLayoutChange,
  initialStep = 'entry',
}) => {
  const [resumes, setResumes] = useState<SavedResume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<SelectorStep>(initialStep)
  const [showEmptyResumeDialog, setShowEmptyResumeDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    const loadResumes = async () => {
      try {
        setLoading(true)
        const allResumes = await getAllResumes()
        setResumes(allResumes)
        setError(null)
      } catch (err) {
        console.error('Failed to load resumes:', err)
        setError('加载简历列表失败，请稍后重试。')
      } finally {
        setLoading(false)
      }
    }

    void loadResumes()
  }, [])

  useEffect(() => {
    if (step !== 'existing') return
    if (loading || error) return
    if (resumes.length > 0) return

    // 列表为空时，回到入口并给出明确引导，而不是停留在空白列表页。
    setStep('entry')
    setShowEmptyResumeDialog(true)
  }, [step, loading, error, resumes.length])

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(resumes.length / RESUMES_PER_PAGE)),
    [resumes.length],
  )

  const pagedResumes = useMemo(() => {
    const start = currentPage * RESUMES_PER_PAGE
    return resumes.slice(start, start + RESUMES_PER_PAGE)
  }, [resumes, currentPage])

  useEffect(() => {
    onLayoutChange?.()
  }, [step, loading, resumes.length, error, showEmptyResumeDialog, currentPage, onLayoutChange])

  useEffect(() => {
    setCurrentPage(0)
  }, [step, resumes.length])

  useEffect(() => {
    if (currentPage < totalPages) return
    setCurrentPage(Math.max(0, totalPages - 1))
  }, [currentPage, totalPages])

  const handleSelectExistingClick = () => {
    if (loading || error) {
      setStep('existing')
      return
    }
    if (resumes.length === 0) {
      setShowEmptyResumeDialog(true)
      return
    }
    setStep('existing')
  }

  const noResumeDialog = showEmptyResumeDialog ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-resume-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowEmptyResumeDialog(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-none fresh:rounded-2xl border-2 fresh:border border-black fresh:border-slate-200/80 bg-chat-surface p-6 shadow-[5px_5px_0px_0px_#000000] fresh:shadow-xl">
        <h3 id="no-resume-title" className="text-base font-semibold text-slate-900">
          当前没有可用简历
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          还没有检测到已保存简历，是否前往新建简历页面？
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setShowEmptyResumeDialog(false)}
            className="flex-1 rounded-none fresh:rounded-xl border border-black fresh:border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:bg-slate-50 hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEmptyResumeDialog(false)
              onCreateResume?.()
            }}
            className="flex-1 rounded-none fresh:rounded-xl border border-black fresh:border-blue-600 bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm transition-all hover:bg-blue-700 hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0"
          >
            去新建简历
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (step === 'entry') {
    return (
      <>
        <div className="my-4 rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface p-5 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-sm dark:border-white dark:bg-slate-900 dark:shadow-[3px_3px_0px_0px_#ffffff]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-chat-ink dark:text-slate-100">开始处理简历</h3>
              <p className="mt-0.5 text-xs text-chat-ink-muted">选择一种方式开始</p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="-mr-1 shrink-0 rounded-none fresh:rounded-md px-2 py-1 text-xs font-medium text-chat-ink-muted transition-colors hover:bg-chat-canvas hover:text-chat-ink dark:hover:bg-slate-800"
              >
                取消
              </button>
            )}
          </div>

          {onFillCreatePrompt && (
            <button
              type="button"
              onClick={onFillCreatePrompt}
              className="group flex w-full items-center gap-3 rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-blue-200 bg-chat-user-bubble/60 p-3.5 text-left shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:bg-chat-user-bubble hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 fresh:hover:border-blue-300 dark:border-white dark:bg-slate-800 dark:shadow-[2px_2px_0px_0px_#ffffff] dark:hover:bg-slate-700"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-none fresh:rounded-lg border border-black fresh:border-blue-500 bg-chat-accent text-white dark:border-white">
                <MessageSquare className="size-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-chat-ink dark:text-slate-100">对话创建简历</span>
                  <span className="rounded-none fresh:rounded-full border border-black fresh:border-transparent bg-chat-accent px-1.5 py-px text-[10px] font-bold text-white dark:border-white">推荐</span>
                </span>
                <span className="mt-0.5 block text-xs text-chat-ink-muted">像聊天一样说说经历，我来帮你生成</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-chat-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-chat-accent-deep" />
            </button>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onImportResume?.()}
              className="group flex items-center justify-center gap-2 rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface py-3 text-chat-ink shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:text-chat-accent-deep hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 fresh:hover:border-blue-300 fresh:hover:bg-blue-50/50 dark:border-white dark:bg-slate-900 dark:text-slate-200 dark:shadow-[2px_2px_0px_0px_#ffffff]"
            >
              <Upload className="size-4 text-chat-ink-muted transition-colors group-hover:text-chat-accent-deep" strokeWidth={2} />
              <span className="text-xs font-semibold">导入简历</span>
            </button>

            <button
              type="button"
              onClick={() => onCreateResume?.()}
              className="group flex items-center justify-center gap-2 rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface py-3 text-chat-ink shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:text-chat-accent-deep hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 fresh:hover:border-blue-300 fresh:hover:bg-blue-50/50 dark:border-white dark:bg-slate-900 dark:text-slate-200 dark:shadow-[2px_2px_0px_0px_#ffffff]"
            >
              <FilePlus2 className="size-4 text-chat-ink-muted transition-colors group-hover:text-chat-accent-deep" strokeWidth={2} />
              <span className="text-xs font-semibold">新建简历</span>
            </button>

            <button
              type="button"
              onClick={handleSelectExistingClick}
              className="group flex items-center justify-center gap-2 rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface py-3 text-chat-ink shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:text-chat-accent-deep hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 fresh:hover:border-blue-300 fresh:hover:bg-blue-50/50 dark:border-white dark:bg-slate-900 dark:text-slate-200 dark:shadow-[2px_2px_0px_0px_#ffffff]"
            >
              <FileText className="size-4 text-chat-ink-muted transition-colors group-hover:text-chat-accent-deep" strokeWidth={2} />
              <span className="text-xs font-semibold">选择已有</span>
            </button>
          </div>
        </div>
        {noResumeDialog}
      </>
    )
  }

  if (loading) {
    return (
      <div className="my-4 rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface p-6 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-sm">
        <div className="flex items-center gap-3 text-blue-600">
          <div className="size-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">正在加载简历列表...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <div className="my-4 rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-amber-200 bg-amber-50 p-6 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-sm">
          <p className="text-amber-700 text-sm">
            暂时无法读取远端简历列表。你可以先新建简历，或稍后重试。
          </p>
          <div className="mt-4 flex items-center gap-2">
            {onCreateResume && (
              <button
                type="button"
                onClick={onCreateResume}
                className="flex-1 rounded-none fresh:rounded-lg border border-black fresh:border-blue-600 bg-blue-600 py-2 text-sm text-white shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm transition-all hover:bg-blue-700 hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0"
              >
                去新建简历
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep('entry')}
              className="flex-1 rounded-none fresh:rounded-lg border border-transparent py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              返回
            </button>
          </div>
        </div>
        {noResumeDialog}
      </>
    )
  }

  if (resumes.length === 0) {
    return (
      <>
        <div className="my-4 rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface p-6 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-sm">
        <div className="text-center py-4">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-none fresh:rounded-xl border border-black fresh:border-slate-200 bg-slate-100">
            <FileText className="size-5 text-slate-500" />
          </div>
          <p className="text-slate-600 text-sm mb-2">暂无可用简历</p>
          <p className="text-slate-400 text-xs text-pretty">
            请先创建一份简历，再回到 Agent 中加载。
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {onCreateResume && (
            <button
              type="button"
              onClick={onCreateResume}
              className="flex-1 rounded-none fresh:rounded-lg border border-black fresh:border-blue-600 bg-blue-600 py-2 text-sm text-white shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm transition-all hover:bg-blue-700 hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0"
            >
              去创建
            </button>
          )}
          <button
            type="button"
            onClick={() => setStep('entry')}
            className="flex-1 rounded-none fresh:rounded-lg border border-transparent py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            返回
          </button>
        </div>
        </div>
        {noResumeDialog}
      </>
    )
  }

  return (
    <>
      <div className="my-4 rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface p-5 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-sm dark:border-white dark:bg-slate-900 dark:shadow-[3px_3px_0px_0px_#ffffff]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-none fresh:rounded-lg border border-black fresh:border-blue-500 bg-chat-accent text-white dark:border-white">
            <FileText className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-chat-ink dark:text-slate-100 text-balance">选择一份简历</h3>
            <p className="text-xs text-chat-ink-muted text-pretty">
              点击卡片后会在右侧展示 PDF 预览。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <div className="inline-flex items-center gap-1 rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-chat-canvas px-1 py-1 dark:border-slate-600 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="size-7 rounded-none fresh:rounded-md text-chat-ink hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="上一页"
                title="上一页"
              >
                <ChevronLeft className="size-4 mx-auto" />
              </button>
              <span className="px-1 text-xs text-chat-ink-muted tabular-nums">
                {currentPage + 1}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="size-7 rounded-none fresh:rounded-md text-chat-ink hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="下一页"
                title="下一页"
              >
                <ChevronRight className="size-4 mx-auto" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep('entry')}
            className="inline-flex items-center gap-1 text-xs font-medium text-chat-ink-muted hover:text-chat-ink px-2 py-1.5 rounded-none fresh:rounded-md hover:bg-chat-canvas transition-colors dark:hover:bg-slate-800"
          >
            <ArrowLeft className="size-3.5" />
            返回
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-medium text-chat-ink-muted hover:text-chat-ink px-2 py-1.5 rounded-none fresh:rounded-md hover:bg-chat-canvas transition-colors dark:hover:bg-slate-800"
            >
              取消
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-1">
          {pagedResumes.map((resume) => (
            <button
              key={resume.id}
              type="button"
              onClick={() => onSelect(resume)}
              className="group/card flex flex-col items-center rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 bg-chat-surface p-4 text-center cursor-pointer shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 fresh:hover:border-blue-300 fresh:hover:bg-blue-50/40 dark:border-white dark:bg-slate-900 dark:shadow-[2px_2px_0px_0px_#ffffff]"
            >
              <div className="mb-2.5 flex size-11 items-center justify-center rounded-none fresh:rounded-lg border border-black fresh:border-blue-200 bg-chat-accent fresh:bg-blue-50 text-white fresh:text-blue-600 dark:border-white">
                <FileText className="size-5" />
              </div>

              <h4 className="w-full truncate text-sm font-bold text-chat-ink transition-colors group-hover/card:text-chat-accent-deep dark:text-slate-100">
                {resume.name || '未命名简历'}
              </h4>

              <div className="mt-1 flex min-h-[18px] items-center justify-center">
                {resume.alias && resume.alias.trim() !== '' ? (
                  <span className="inline-flex items-center rounded-none fresh:rounded-full border border-black fresh:border-blue-100 bg-chat-user-bubble px-2 py-0.5 text-[10px] font-semibold text-chat-accent-deep dark:border-white dark:bg-slate-800 dark:text-blue-300">
                    {resume.alias.trim()}
                  </span>
                ) : (
                  <span className="text-[11px] text-chat-ink-muted">简历</span>
                )}
              </div>

              <div className="mt-2.5 w-full border-t border-black/20 fresh:border-slate-200 pt-2 dark:border-slate-700">
                <p className="text-[10px] tabular-nums text-chat-ink-muted">
                  更新于 {formatDate(resume.updatedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-chat-ink-muted tabular-nums">共 {resumes.length} 份简历可选</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={`page-dot-${idx}`}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`h-1.5 rounded-none fresh:rounded-full transition-all ${
                  idx === currentPage ? 'w-4 bg-chat-accent' : 'w-1.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                }`}
                aria-label={`第 ${idx + 1} 页`}
                title={`第 ${idx + 1} 页`}
              />
            ))}
          </div>
        )}
      </div>
      </div>
      {noResumeDialog}
    </>
  )
}

export default ResumeSelector
