/**
 * 共享日期选择器（与投递进展表投递时间同款 UI，选中态为蓝色）
 */
import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function parseDateString(value: string | null | undefined): Date | null {
  if (!value) return null
  const raw = value.trim()
  // 支持 YYYY-MM 与 YYYY-MM-DD
  const ym = /^(\d{4})-(\d{2})$/.exec(raw)
  if (ym) {
    const y = Number(ym[1])
    const mo = Number(ym[2]) - 1
    const dt = new Date(y, mo, 1)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo) return null
    return dt
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt
}

function formatDateString(dt: Date): string {
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export interface InlineDatePickerProps {
  value: string | null
  placeholder?: string
  onSelect: (value: string | null) => void
  triggerId?: string
  triggerClassName?: string
  /** 可选择的最晚月份，格式为 YYYY-MM */
  maxValue?: string
  /** 未选择日期时打开面板所定位的年份偏移量 */
  defaultYearOffset?: number
  /** 未选择日期时的初始视图 */
  initialView?: 'month' | 'year'
  /** 用于多实例时区分 portal 容器，不传则使用 useId */
  portalId?: string
}

export function InlineDatePicker({
  value,
  placeholder = '选择日期',
  onSelect,
  triggerId,
  triggerClassName,
  maxValue,
  defaultYearOffset = 0,
  initialView = 'month',
  portalId: portalIdProp,
}: InlineDatePickerProps) {
  const reactId = useId()
  const portalId = portalIdProp ?? `date-picker-portal-${reactId.replace(/:/g, '')}`

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 })
  const selectedDate = parseDateString(value)
  const maxDate = parseDateString(maxValue)
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear() + defaultYearOffset)
  const [currentMonth, setCurrentMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())
  const [view, setView] = useState<'month' | 'year'>(selectedDate ? 'month' : initialView)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      const portalRoot = document.getElementById(portalId)
      if (triggerRef.current?.contains(target)) return
      if (portalRoot?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, portalId])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopupPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [open, currentYear, currentMonth, view])

  const selectedStr = selectedDate ? formatDateString(selectedDate) : ''
  const maxStr = maxDate ? formatDateString(maxDate) : ''
  const decadeStart = Math.floor(currentYear / 10) * 10
  const isAtLatestMonth = Boolean(
    maxDate
      && (currentYear > maxDate.getFullYear()
        || (currentYear === maxDate.getFullYear() && currentMonth >= maxDate.getMonth()))
  )

  return (
    <>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'w-full h-11 rounded-xl border px-4 text-left flex items-center justify-between gap-2 transition-colors',
          'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500',
          triggerClassName,
        )}
      >
        <span className={cn('truncate text-[15px]', selectedDate ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400')}>
          {selectedDate ? formatDateString(selectedDate) : placeholder}
        </span>
        <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
      </button>
      {open && typeof document !== 'undefined' &&
        createPortal(
          <div id={portalId} className="fixed inset-0 z-[10000]" style={{ pointerEvents: 'none' }}>
            <div
              role="dialog"
              aria-label="选择年月"
              className="absolute rounded-none fresh:rounded-xl border-2 fresh:border border-black fresh:border-slate-200 dark:border-white fresh:dark:border-slate-700 bg-[#F7F7F2] fresh:bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-xl dark:shadow-[3px_3px_0px_0px_#ffffff] p-3 font-mono fresh:font-sans"
              style={{ top: popupPos.top, left: popupPos.left, width: popupPos.width, pointerEvents: 'auto' }}
            >
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  aria-label={view === 'month' ? '上一个月' : '前十年'}
                  className="flex h-8 w-8 items-center justify-center rounded-none fresh:rounded-md border border-transparent hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:border-white dark:hover:bg-slate-800"
                  onClick={() => {
                    if (view === 'month') {
                      if (currentMonth === 0) {
                        setCurrentYear((y) => y - 1)
                        setCurrentMonth(11)
                      } else {
                        setCurrentMonth((m) => m - 1)
                      }
                      return
                    }
                    setCurrentYear((y) => y - 10)
                  }}
                >
                  <ChevronLeft aria-hidden="true" className="w-4 h-4 text-black fresh:text-slate-600 dark:text-slate-200" />
                </button>
                <button
                  type="button"
                  className="h-8 px-2 rounded-none fresh:rounded-md border border-transparent text-sm font-bold fresh:font-semibold text-black fresh:text-slate-800 dark:text-slate-200 hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:border-white dark:hover:bg-slate-800"
                  onClick={() => setView((v) => (v === 'month' ? 'year' : 'month'))}
                  title="点击切换年份选择"
                >
                  {view === 'month'
                    ? `${currentYear}年`
                    : `${decadeStart} - ${decadeStart + 9}`}
                </button>
                <button
                  type="button"
                  aria-label={view === 'month' ? '下一个月' : '后十年'}
                  disabled={view === 'month' && isAtLatestMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-none fresh:rounded-md border border-transparent hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:border-white dark:hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-30"
                  onClick={() => {
                    if (view === 'month') {
                      if (currentMonth === 11) {
                        setCurrentYear((y) => y + 1)
                        setCurrentMonth(0)
                      } else {
                        setCurrentMonth((m) => m + 1)
                      }
                      return
                    }
                    setCurrentYear((y) => y + 10)
                  }}
                >
                  <ChevronRight aria-hidden="true" className="w-4 h-4 text-black fresh:text-slate-600 dark:text-slate-200" />
                </button>
              </div>
              {view === 'month' ? (
                <div className="grid grid-cols-4 gap-2 py-2">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const m = i + 1
                    const valueStr = `${currentYear}-${String(m).padStart(2, '0')}`
                    const active = valueStr === selectedStr
                    const disabled = Boolean(maxStr && valueStr > maxStr)
                    return (
                      <button
                        key={valueStr}
                        type="button"
                        disabled={disabled}
                        className={cn(
                          'h-10 rounded-none fresh:rounded-lg border text-sm font-bold fresh:font-medium transition-[background-color,border-color,box-shadow,color] disabled:pointer-events-none disabled:text-slate-300 dark:disabled:text-slate-600',
                          active
                            ? 'bg-blue-700 fresh:bg-blue-600 text-white border-black fresh:border-transparent shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none dark:border-white'
                            : 'border-transparent text-black fresh:text-slate-700 dark:text-slate-200 hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:border-white dark:hover:bg-slate-800'
                        )}
                        onClick={() => {
                          onSelect(valueStr)
                          setOpen(false)
                        }}
                      >
                        {m}月
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 py-2">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const y = decadeStart - 1 + i
                    const isInDecade = y >= decadeStart && y <= decadeStart + 9
                    const active = selectedDate ? selectedDate.getFullYear() === y : false
                    const disabled = Boolean(maxDate && y > maxDate.getFullYear())
                    return (
                      <button
                        key={y}
                        type="button"
                        disabled={disabled}
                        className={cn(
                          'h-10 rounded-none fresh:rounded-lg border text-sm font-bold fresh:font-medium transition-[background-color,border-color,box-shadow,color] disabled:pointer-events-none disabled:text-slate-300 dark:disabled:text-slate-600',
                          active
                            ? 'bg-blue-700 fresh:bg-blue-600 text-white border-black fresh:border-transparent shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none dark:border-white'
                            : isInDecade
                              ? 'border-transparent text-black fresh:text-slate-700 dark:text-slate-200 hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:border-white dark:hover:bg-slate-800'
                              : 'border-transparent text-slate-400 fresh:text-slate-300 dark:text-slate-600 hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-100/60'
                        )}
                        onClick={() => {
                          setCurrentYear(y)
                          setView('month')
                        }}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="mt-3 flex justify-between gap-2 border-t-2 fresh:border-t border-black fresh:border-slate-200 dark:border-white fresh:dark:border-slate-700 pt-3">
                <button
                  type="button"
                  className="h-8 px-3 rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white dark:bg-slate-900 text-sm font-bold fresh:font-medium text-black fresh:text-slate-600 dark:text-slate-200 shadow-[1px_1px_0px_0px_#000000] fresh:shadow-none dark:shadow-[1px_1px_0px_0px_#ffffff] hover:bg-[#E5E5E0] fresh:hover:bg-slate-50"
                  onClick={() => {
                    onSelect(null)
                    setOpen(false)
                  }}
                >
                  清空
                </button>
                <button
                  type="button"
                  className="h-8 px-3 rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white dark:bg-slate-900 text-sm font-bold fresh:font-medium text-black fresh:text-slate-600 dark:text-slate-200 shadow-[1px_1px_0px_0px_#000000] fresh:shadow-none dark:shadow-[1px_1px_0px_0px_#ffffff] hover:bg-[#E5E5E0] fresh:hover:bg-slate-50"
                  onClick={() => {
                    const now = new Date()
                    onSelect(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
                    setOpen(false)
                  }}
                >
                  今天
                </button>
                <button
                  type="button"
                  aria-label="关闭日期选择"
                  className="flex h-8 w-8 items-center justify-center rounded-none fresh:rounded-md border border-transparent text-slate-600 dark:text-slate-300 hover:border-black fresh:hover:border-transparent hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 dark:hover:border-white dark:hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export default InlineDatePicker
