import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PortalDropdownOption = {
  value: string
  label: string
  hint?: string
}

type PortalDropdownProps = {
  value: string | null
  options: PortalDropdownOption[]
  placeholder: string
  disabled?: boolean
  autoOpen?: boolean
  onSelect: (value: string | null) => void
  onClose?: () => void
  onOpen?: () => void
  allowCreate?: boolean
  createPlaceholder?: string
  onCreateOption?: (label: string) => string | null
  dropdownClassName?: string
  selectedIcon?: ReactNode
  badgeClassByValue?: Record<string, string>
  renderBadgeOption?: boolean
  triggerClassName?: string
  triggerLabelClassName?: string
  triggerId?: string
  portalId?: string
}

export default function PortalDropdown({
  value,
  options,
  placeholder,
  disabled,
  autoOpen,
  onSelect,
  onClose,
  onOpen,
  allowCreate,
  createPlaceholder,
  onCreateOption,
  dropdownClassName,
  selectedIcon,
  badgeClassByValue,
  renderBadgeOption,
  triggerClassName,
  triggerLabelClassName,
  triggerId,
  portalId = 'portal-dropdown-root',
}: PortalDropdownProps) {
  const [open, setOpen] = useState(Boolean(autoOpen) && !disabled)
  const [createValue, setCreateValue] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (autoOpen && !disabled) {
      setOpen(true)
      onOpen?.()
    }
  }, [autoOpen, disabled, onOpen])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      const target = event.target as Node
      const portalRoot = document.getElementById(portalId)
      if (rootRef.current.contains(target)) return
      if (portalRoot?.contains(target)) return
      setOpen(false)
      onClose?.()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [onClose, portalId])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 220)
    const maxLeft = window.innerWidth - width - 8
    setPopupPos({
      top: rect.bottom + 2,
      left: Math.max(8, Math.min(rect.left, maxLeft)),
      width,
    })
  }, [open, options.length, value])

  const selected = options.find((opt) => opt.value === (value ?? ''))

  return (
    <div ref={rootRef} className={cn('relative w-full', open && 'z-[300]')}>
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return
          setOpen((prev) => {
            const next = !prev
            if (next) onOpen?.()
            return next
          })
        }}
        className={cn(
          'w-full h-8 rounded-none border px-2 text-left flex items-center justify-between gap-1 transition-all duration-200',
          'bg-transparent',
          disabled
            ? 'text-slate-300 cursor-not-allowed'
            : 'border-transparent text-slate-800 dark:text-slate-200 hover:border-black dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50',
          triggerClassName
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {selected && selectedIcon}
          {selected ? (
            renderBadgeOption ? (
              <span
                className={cn(
                  'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold uppercase tracking-wide shrink-0',
                  badgeClassByValue?.[selected.value] || 'bg-slate-100 text-slate-700'
                )}
              >
                {selected.label}
              </span>
            ) : (
              <span className={cn('truncate text-sm font-semibold text-slate-800 dark:text-slate-100', triggerLabelClassName)}>
                {selected.label}
              </span>
            )
          ) : (
            <span className={cn('truncate text-sm text-slate-400 font-medium', triggerLabelClassName)}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-300',
            open && 'rotate-180 text-slate-600'
          )}
        />
      </button>

      {open &&
        !disabled &&
        typeof document !== 'undefined' &&
        createPortal(
          <div id={portalId} className="fixed inset-0 z-[1200]" style={{ pointerEvents: 'none' }}>
            <div
              role="listbox"
              className={cn(
                'absolute overflow-hidden rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[3px_3px_0px_0px_#000000] fresh:shadow-lg dark:shadow-[3px_3px_0px_0px_#ffffff]',
                dropdownClassName
              )}
              style={{ top: popupPos.top, left: popupPos.left, width: popupPos.width, maxWidth: 320, pointerEvents: 'auto' }}
            >
              <div className="max-h-60 overflow-auto">
                {options.map((opt) => {
                  const active = opt.value === (value ?? '')
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      key={opt.value}
                      className={cn(
                        'w-full text-left px-3 py-2 transition-colors text-sm flex items-start gap-2',
                        active
                          ? 'bg-slate-100 fresh:bg-blue-50 dark:bg-slate-800 text-slate-900 fresh:text-blue-700 dark:text-white'
                          : 'hover:bg-slate-50 fresh:hover:bg-blue-50/60 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                      )}
                      onClick={() => {
                        onSelect(opt.value)
                        setOpen(false)
                        onClose?.()
                      }}
                    >
                      <span className="pt-0.5 shrink-0">
                        {active ? <Check className="w-3.5 h-3.5" /> : <span className="inline-block w-3.5 h-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        {renderBadgeOption ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold uppercase tracking-wide',
                              badgeClassByValue?.[opt.value] || 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {opt.label}
                          </span>
                        ) : (
                          <span className="block truncate">{opt.label}</span>
                        )}
                        {opt.hint && (
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{opt.hint}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
              {allowCreate && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={createValue}
                      onChange={(e) => setCreateValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        const created = onCreateOption?.(createValue.trim())
                        if (!created) return
                        onSelect(created)
                        setCreateValue('')
                        setOpen(false)
                        onClose?.()
                      }}
                      placeholder={createPlaceholder || '新增...'}
                      className="flex-1 h-7 border border-black dark:border-slate-600 rounded-none px-2 text-xs bg-white dark:bg-slate-900 outline-none focus:border-slate-900 dark:focus:border-slate-100"
                    />
                    <button
                      type="button"
                      className="h-7 px-2 rounded-none border border-black bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:opacity-90"
                      onClick={() => {
                        const created = onCreateOption?.(createValue.trim())
                        if (!created) return
                        onSelect(created)
                        setCreateValue('')
                        setOpen(false)
                        onClose?.()
                      }}
                    >
                      新增
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
