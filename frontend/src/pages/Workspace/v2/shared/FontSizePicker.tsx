/**
 * 字号选择器：点击弹出网格选择面板
 * 风格与 MonthYearRangePicker 一致
 */
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../../../lib/utils'

interface FontSizePickerProps {
  value: number
  onChange: (size: number) => void
  options?: number[]
  defaultValue?: number
  className?: string
}

const DEFAULT_OPTIONS = [13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28]

export function FontSizePicker({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  defaultValue = 15,
  className
}: FontSizePickerProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({ top: rect.bottom + 4, left: rect.left })
    }
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const portalRoot = document.getElementById('font-size-picker-portal')
      if (portalRoot?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (size: number) => {
    onChange(size)
    setOpen(false)
  }

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(defaultValue)
  }

  return (
    <div className={cn('relative', className)} ref={triggerRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) } }}
        className={cn(
          'h-6 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-1 transition-colors min-w-[60px]',
          open
            ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
            : 'border-slate-200 dark:border-neutral-600 hover:border-slate-300 dark:hover:border-neutral-500',
          'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 cursor-pointer'
        )}
      >
        <span>{value}px</span>
        {value !== defaultValue && (
          <button
            type="button"
            onClick={clearValue}
            className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-400"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 弹层挂到 body */}
      {typeof document !== 'undefined' && createPortal(
        <div id="font-size-picker-portal" className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="fixed w-48 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3"
                style={{ top: position.top, left: position.left, zIndex: 10000, pointerEvents: 'auto' }}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {options.map((size) => {
                    const isSelected = value === size
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSelect(size)}
                        className={cn(
                          'py-1.5 rounded-lg text-xs font-medium transition-all',
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                        )}
                      >
                        {size}
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

export default FontSizePicker
