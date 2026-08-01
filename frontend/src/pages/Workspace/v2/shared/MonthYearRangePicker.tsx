/**
 * 起止时间选择器：两个输入框（开始 / 结束），点击分别弹出月份选择器
 * 左侧框：年+月网格（图3）；右侧框：年+月网格 +「至今」选项（图4）
 * 弹层用 Portal 挂到 body，避免被父级 overflow 裁剪
 */
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../../lib/utils'
import { EDITOR_CONTROL_CLASS, EDITOR_LABEL_CLASS } from '../EditPanel/editorStyles'

const MONTHS = ['01月', '02月', '03月', '04月', '05月', '06月', '07月', '08月', '09月', '10月', '11月', '12月']

/** 仅使用一种格式：YYYY-MM - YYYY-MM / YYYY-MM - 至今 */
function parseDateRange(dateStr: string): { start: string; end: string } {
  const raw = String(dateStr || '').trim()
  if (!raw) return { start: '', end: '' }
  if (!raw.includes(' - ')) return { start: raw, end: '' }
  const [start, end] = raw.split(' - ')
  return { start: (start || '').trim(), end: (end || '').trim() }
}

const VALID_START = /^\d{4}-\d{2}$/
function normalizeToken(token: string): string {
  const t = String(token || '').trim()
  if (!t || t === 'undefined' || t === 'null') return ''
  if (t === '至今') return t
  return VALID_START.test(t) ? t : ''
}

function isValidEnd(e: string): boolean {
  return e === '至今' || VALID_START.test(e)
}

interface MonthYearRangePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function MonthYearRangePicker({ value, onChange, label = '起止时间', className }: MonthYearRangePickerProps) {
  const parsed = parseDateRange(value || '')
  const start = normalizeToken(parsed.start)
  const end = normalizeToken(parsed.end)
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const currentYear = new Date().getFullYear()
  const parseYear = (s: string): number => {
    if (!s || s.length < 4) return currentYear
    const y = parseInt(s.slice(0, 4), 10)
    return Number.isNaN(y) ? currentYear : y
  }
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [yearStart, setYearStart] = useState(() => (start ? parseYear(start) : currentYear))
  const [yearEnd, setYearEnd] = useState(() => (end && end !== '至今' ? parseYear(end) : currentYear))
  const [startPos, setStartPos] = useState({ top: 0, left: 0 })
  const [endPos, setEndPos] = useState({ top: 0, left: 0 })
  const startTriggerRef = useRef<HTMLDivElement>(null)
  const endTriggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftStart(start)
    setDraftEnd(end)
  }, [start, end])

  useEffect(() => {
    if (draftStart) setYearStart(parseYear(draftStart))
  }, [draftStart])
  useEffect(() => {
    if (draftEnd && draftEnd !== '至今') setYearEnd(parseYear(draftEnd))
  }, [draftEnd])

  useLayoutEffect(() => {
    if (startOpen && startTriggerRef.current) {
      const rect = startTriggerRef.current.getBoundingClientRect()
      setStartPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [startOpen])
  useLayoutEffect(() => {
    if (endOpen && endTriggerRef.current) {
      const rect = endTriggerRef.current.getBoundingClientRect()
      setEndPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [endOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (startTriggerRef.current?.contains(target) || endTriggerRef.current?.contains(target)) return
      const portalRoot = document.getElementById('month-year-picker-portal')
      if (portalRoot?.contains(target)) return
      setStartOpen(false)
      setEndOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const commit = (newStart: string, newEnd: string) => {
    setDraftStart(newStart)
    setDraftEnd(newEnd)

    const shouldBlock =
      !!newStart &&
      !!newEnd &&
      newEnd !== '至今' &&
      VALID_START.test(newStart) &&
      VALID_START.test(newEnd) &&
      newStart > newEnd

    // 保持红色错误提示，但不写回父级数据，避免触发自动渲染
    if (shouldBlock) return

    if (!newStart && !newEnd) {
      onChange('')
      return
    }
    if (newEnd) {
      onChange(`${newStart || ''} - ${newEnd}`)
      return
    }
    onChange(newStart)
  }

  const handleSelectStart = (month: number) => {
    const m = month.toString().padStart(2, '0')
    const y = Number.isNaN(yearStart) ? currentYear : yearStart
    const newStart = `${y}-${m}`
    commit(newStart, draftEnd)
    setStartOpen(false)
  }

  const handleSelectEnd = (month: number | '至今') => {
    if (month === '至今') {
      commit(draftStart, '至今')
      setEndOpen(false)
      return
    }
    const m = month.toString().padStart(2, '0')
    const y = Number.isNaN(yearEnd) ? currentYear : yearEnd
    const newEnd = `${y}-${m}`
    commit(draftStart, newEnd)
    setEndOpen(false)
  }

  const clearStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    commit('', draftEnd)
  }
  const clearEnd = (e: React.MouseEvent) => {
    e.stopPropagation()
    commit(draftStart, '')
  }

  // 开始时间不能晚于结束时间（结束为「至今」时不做比较；仅当两端均为合法 YYYY-MM 时比较）
  const isInvalidRange =
    !!draftStart &&
    !!draftEnd &&
    draftEnd !== '至今' &&
    VALID_START.test(draftStart) &&
    VALID_START.test(draftEnd) &&
    draftStart > draftEnd

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className={EDITOR_LABEL_CLASS}>
          {label}
          <span className="text-red-400 ml-0.5">*</span>
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* 左侧：开始时间 */}
        <div className="relative flex-1" ref={startTriggerRef}>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setEndOpen(false); setStartOpen((o) => !o) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStartOpen((o) => !o) } }}
            className={cn(
              EDITOR_CONTROL_CLASS,
              'flex cursor-pointer items-center justify-between text-sm transition-colors',
              isInvalidRange && 'border-red-500 dark:border-red-500',
              startOpen
                ? !isInvalidRange && 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
                : !isInvalidRange && 'hover:border-primary',
            )}
          >
            <span className={cn((!draftStart || !VALID_START.test(draftStart)) && 'text-gray-400 dark:text-neutral-500')}>
              {draftStart && VALID_START.test(draftStart) ? draftStart : '选择开始'}
            </span>
            {draftStart && (
              <button type="button" onClick={clearStart} aria-label="清除开始时间" className="p-0.5 rounded-none fresh:rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <span className="text-gray-400 shrink-0">-</span>

        {/* 右侧：结束时间（含至今） */}
        <div className="relative flex-1" ref={endTriggerRef}>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setStartOpen(false); setEndOpen((o) => !o) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEndOpen((o) => !o) } }}
            className={cn(
              EDITOR_CONTROL_CLASS,
              'flex cursor-pointer items-center justify-between text-sm transition-colors',
              isInvalidRange && 'border-red-500 dark:border-red-500',
              endOpen
                ? !isInvalidRange && 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
                : !isInvalidRange && 'hover:border-primary',
            )}
          >
            <span className={cn((!draftEnd || !isValidEnd(draftEnd)) && 'text-gray-400 dark:text-neutral-500')}>
              {draftEnd && isValidEnd(draftEnd) ? draftEnd : '选择结束'}
            </span>
            {draftEnd && (
              <button type="button" onClick={clearEnd} aria-label="清除结束时间" className="p-0.5 rounded-none fresh:rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      {isInvalidRange && (
        <p className="text-sm text-red-500 dark:text-red-400">开始时间不能晚于结束时间</p>
      )}

      {/* 弹层挂到 body，避免被父级 overflow 裁剪 */}
      {typeof document !== 'undefined' && createPortal(
        <div id="month-year-picker-portal" className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
          <div className="contents">
            <AnimatePresence>
              {startOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="fixed w-64 rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-white p-4 shadow-[4px_4px_0px_0px_#000000] fresh:shadow-lg dark:border-white dark:bg-neutral-800 dark:shadow-[4px_4px_0px_0px_#ffffff]"
                  style={{ top: startPos.top, left: startPos.left, zIndex: 10000, pointerEvents: 'auto' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" aria-label="上一年" onClick={() => setYearStart((y) => y - 1)} className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <span className="font-medium text-gray-800 dark:text-neutral-200">{yearStart}年</span>
                    <button type="button" aria-label="下一年" onClick={() => setYearStart((y) => y + 1)} className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map((label, i) => {
                      const month = i + 1
                      const isSelected = draftStart === `${yearStart}-${month.toString().padStart(2, '0')}`
                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => handleSelectStart(month)}
                          className={cn(
                            'py-2 rounded-none fresh:rounded-md text-sm font-medium transition-colors',
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {endOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="fixed w-64 rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-white p-4 shadow-[4px_4px_0px_0px_#000000] fresh:shadow-lg dark:border-white dark:bg-neutral-800 dark:shadow-[4px_4px_0px_0px_#ffffff]"
                  style={{ top: endPos.top, left: endPos.left, zIndex: 10000, pointerEvents: 'auto' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" aria-label="上一年" onClick={() => setYearEnd((y) => y - 1)} className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
                      <ChevronLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <span className="font-medium text-gray-800 dark:text-neutral-200">{yearEnd}年</span>
                    <button type="button" aria-label="下一年" onClick={() => setYearEnd((y) => y + 1)} className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700">
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map((label, i) => {
                      const month = i + 1
                      const val = draftEnd === '至今' ? '' : draftEnd
                      const isSelected = val === `${yearEnd}-${month.toString().padStart(2, '0')}`
                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => handleSelectEnd(month)}
                          className={cn(
                            'py-2 rounded-none fresh:rounded-md text-sm font-medium transition-colors',
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectEnd('至今')}
                    className={cn(
                      'w-full mt-3 py-2.5 rounded-none fresh:rounded-md text-sm font-medium border transition-colors',
                      draftEnd === '至今'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:border-blue-300'
                    )}
                  >
                    至今
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default MonthYearRangePicker
