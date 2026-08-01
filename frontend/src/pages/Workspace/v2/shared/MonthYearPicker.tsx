/**
 * 单值年月选择器：点击输入框弹出年+月网格，输出格式 YYYY-MM
 * 视觉风格复用 MonthYearRangePicker
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../../lib/utils'
import { EDITOR_CONTROL_CLASS, EDITOR_LABEL_CLASS } from '../EditPanel/editorStyles'

const MONTHS = ['01月', '02月', '03月', '04月', '05月', '06月', '07月', '08月', '09月', '10月', '11月', '12月']
const VALID_MONTH = /^\d{4}-\d{2}$/

function normalizeMonth(raw: string): string {
  const value = String(raw || '').trim()
  if (!value || value === 'undefined' || value === 'null') return ''
  if (VALID_MONTH.test(value)) return value

  // 兼容历史数据：YYYY.MM -> YYYY-MM
  const dotMatch = /^(\d{4})\.(\d{2})$/.exec(value)
  if (dotMatch) return `${dotMatch[1]}-${dotMatch[2]}`

  return ''
}

interface MonthYearPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  placeholder?: string
}

export function MonthYearPicker({
  value,
  onChange,
  label = '时间',
  className,
  placeholder = '选择时间',
}: MonthYearPickerProps) {
  const normalized = normalizeMonth(value)
  const currentYear = new Date().getFullYear()

  const parseYear = (s: string): number => {
    if (!s || s.length < 4) return currentYear
    const y = parseInt(s.slice(0, 4), 10)
    return Number.isNaN(y) ? currentYear : y
  }

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(normalized)
  const [year, setYear] = useState(() => (normalized ? parseYear(normalized) : currentYear))
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const next = normalizeMonth(value)
    setDraft(next)
    if (next) setYear(parseYear(next))
  }, [value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopupPos({ top: rect.bottom + 4, left: rect.left })
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const portalRoot = document.getElementById('month-year-single-picker-portal')
      if (portalRoot?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelectMonth = (month: number) => {
    const token = `${year}-${month.toString().padStart(2, '0')}`
    setDraft(token)
    onChange(token)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft('')
    onChange('')
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className={EDITOR_LABEL_CLASS}>{label}</label>}
      <div className="relative" ref={triggerRef}>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setOpen((v) => !v)
            }
          }}
          className={cn(
            EDITOR_CONTROL_CLASS,
            'flex cursor-pointer items-center justify-between text-sm transition-colors',
            open
              ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
              : 'hover:border-primary'
          )}
        >
          <span className={cn(!draft && 'text-gray-400 dark:text-neutral-500')}>{draft || placeholder}</span>
          {draft && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="清除时间"
              className="p-0.5 rounded-none fresh:rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <div id="month-year-single-picker-portal" className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute w-[220px] rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-white p-3 shadow-[4px_4px_0px_0px_#000000] fresh:shadow-lg dark:border-white dark:bg-neutral-900 dark:shadow-[4px_4px_0px_0px_#ffffff]"
                  style={{ top: popupPos.top, left: popupPos.left, pointerEvents: 'auto' }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button
                      type="button"
                      aria-label="上一年"
                      className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
                      onClick={() => setYear((y) => y - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-neutral-300" />
                    </button>
                    <div className="text-sm font-semibold text-gray-800 dark:text-neutral-100">{year}年</div>
                    <button
                      type="button"
                      aria-label="下一年"
                      className="p-1 rounded-none fresh:rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800"
                      onClick={() => setYear((y) => y + 1)}
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600 dark:text-neutral-300" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTHS.map((m, idx) => {
                      const monthNum = idx + 1
                      const token = `${year}-${String(monthNum).padStart(2, '0')}`
                      const active = token === draft
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMonth(monthNum)}
                          className={cn(
                            'h-8 rounded-none fresh:rounded-md text-sm transition-colors',
                            active
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 dark:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800'
                          )}
                        >
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </div>
  )
}

export default MonthYearPicker
