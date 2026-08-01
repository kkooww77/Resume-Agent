/**
 * 基本信息字段「显示样式」紧凑分段切换：标签 + 值 / 仅值。
 * 原「图标（emoji）」样式已废弃（PDF 无 emoji 字体，渲染不出来）。
 * 例外：博客/GitHub 字段有真实 fontawesome 图标（\faGithub，PDF 可渲染），
 * 通过 allowIcon 单独提供「图标」档：图标 + 地址 / 标签 + 值 / 仅值。
 * 设计：knowledge-base/specs/2026-06-24-per-field-display-style-design.md
 */
import { type ReactNode } from 'react'
import { Tag, Minus, Github } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { FieldLabelMode } from '../types'

interface FieldStyleToggleProps {
  mode: FieldLabelMode
  onModeChange: (mode: FieldLabelMode) => void
  /** 是否提供「图标」档（仅博客/GitHub 这类有真实 fontawesome 图标的字段） */
  allowIcon?: boolean
  /** 该字段的中文标签（如「邮箱」），用于提示里给出本字段的真实示例；
   *  取自 fieldTextLabel()，与实际渲染前缀同源，避免提示与效果不一致 */
  fieldLabel?: string
}

/** 「标签 + 值」的提示按当前字段给例子：邮箱 → 「标签 + 值（邮箱：xxx）」 */
const buildBaseOptions = (
  fieldLabel?: string,
): { mode: FieldLabelMode; Icon: typeof Tag; title: string }[] => [
  {
    mode: 'text',
    Icon: Tag,
    title: fieldLabel ? `标签 + 值（${fieldLabel}：xxx）` : '标签 + 值（如 博客：xxx）',
  },
  { mode: 'none', Icon: Minus, title: '仅值（xxx）' },
]

const ICON_OPTION: { mode: FieldLabelMode; Icon: typeof Tag; title: string } = {
  mode: 'icon',
  Icon: Github,
  title: '图标 + 地址（GitHub 图标）',
}

/** 即时悬浮提示（150ms 淡入，无原生 title 的 1~2s 延迟），支持深色模式 */
function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 opacity-0 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm dark:shadow-[2px_2px_0px_0px_#ffffff] transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 dark:border-white dark:bg-slate-800 dark:text-slate-200"
      >
        {label}
      </span>
    </span>
  )
}

export default function FieldStyleToggle({
  mode,
  onModeChange,
  allowIcon = false,
  fieldLabel,
}: FieldStyleToggleProps) {
  const baseOptions = buildBaseOptions(fieldLabel)
  const options = allowIcon ? [ICON_OPTION, ...baseOptions] : baseOptions
  return (
    <div className="flex items-center gap-1">
      <div className="inline-flex items-center rounded-none fresh:rounded-md border border-black fresh:border-slate-200 dark:border-white bg-[#F1F2F5] dark:bg-[#2A2A2A] p-0.5">
        {options.map(({ mode: m, Icon, title }) => (
          <Tip key={m} label={title}>
            <button
              type="button"
              onClick={() => onModeChange(m)}
              aria-label={title}
              aria-pressed={mode === m}
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-none fresh:rounded-md transition-[transform,box-shadow,background-color,color] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                mode === m
                  ? 'bg-white dark:bg-[#2A2A2A] text-blue-600 dark:text-blue-400 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm dark:shadow-[2px_2px_0px_0px_#ffffff]'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
              )}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </Tip>
        ))}
      </div>
    </div>
  )
}
