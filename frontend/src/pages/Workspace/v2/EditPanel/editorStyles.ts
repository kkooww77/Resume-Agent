/**
 * Workspace 编辑器的视觉基线。
 *
 * NEO 用 1px 黑色描边建立结构、2px 硬阴影强调层级；Fresh 只保留轻描边。
 * 2px 实线仅用于主要操作，2px 虚线仅用于“新增”入口，避免页面到处都是粗框。
 */
export const EDITOR_PANEL_CLASS =
  'space-y-4 p-4 rounded-none fresh:rounded-md bg-[#F7F7F2] fresh:bg-white dark:bg-neutral-900/30'

export const EDITOR_ITEM_CLASS =
  'overflow-hidden rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white dark:border-white dark:bg-[#1C1C1C] shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none dark:shadow-[2px_2px_0px_0px_#ffffff] transition-[border-color,box-shadow,opacity] duration-200'

export const EDITOR_ITEM_HEADER_CLASS =
  'flex min-h-16 cursor-pointer select-none items-center justify-between gap-3 px-4 py-3'

export const EDITOR_ITEM_BODY_CLASS =
  'space-y-5 border-t border-black fresh:border-slate-200 px-4 py-4 dark:border-white'

export const EDITOR_LABEL_CLASS =
  'block min-h-5 font-mono fresh:font-sans text-xs fresh:text-sm font-bold fresh:font-medium text-[#444850] fresh:text-slate-600 dark:text-neutral-300'

export const EDITOR_CONTROL_CLASS =
  'w-full min-h-11 rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white px-3 py-2 text-slate-700 dark:border-white dark:bg-[#1C1C1C] dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 fresh:focus-visible:border-blue-400 fresh:focus-visible:ring-blue-200'

export const EDITOR_COMPOSITE_CONTROL_CLASS =
  'overflow-hidden rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white dark:border-white dark:bg-[#1C1C1C] focus-within:ring-2 focus-within:ring-blue-700 fresh:focus-within:border-blue-400 fresh:focus-within:ring-blue-200'

export const EDITOR_INSET_CLASS =
  'rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-[#ECEDE9] fresh:bg-slate-50 p-3 dark:border-white dark:bg-neutral-900/50'

export const EDITOR_ADD_BUTTON_CLASS =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-none fresh:rounded-md border-2 fresh:border border-dashed border-black fresh:border-slate-300 px-4 py-3 text-slate-600 transition-colors duration-200 hover:border-primary hover:bg-primary/5 dark:border-white dark:text-neutral-400'

export const EDITOR_DRAG_HINT_CLASS =
  'flex items-center gap-1.5 px-1 text-xs text-slate-500 dark:text-neutral-400'
