import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Pin } from 'lucide-react'
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { FileText, Trash2 } from './Icons'
import { cn } from '@/lib/utils'
import type { SavedResume } from '@/services/resumeStorage'

// 格式化时间为 年/月/日 时:分
const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

interface ResumeCardProps {
  resume: SavedResume
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate?: (id: string) => void
  /** 卡片序号（从 1 开始） */
  index?: number
  /** 是否处于多选模式 */
  isMultiSelectMode?: boolean
  /** 是否被选中（用于批量删除） */
  isSelected?: boolean
  /** 选中状态变化回调 */
  onSelectChange?: (id: string, selected: boolean) => void
  /** 备注/别名变化回调 */
  onAliasChange?: (id: string, alias: string) => void
  /** 置顶切换回调 */
  onTogglePin?: (id: string) => void
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  resume,
  onEdit,
  onDelete,
  onDuplicate,
  index,
  isMultiSelectMode = false,
  isSelected = false,
  onSelectChange,
  onAliasChange,
  onTogglePin
}) => {
  const [isEditingAlias, setIsEditingAlias] = useState(false)
  const [aliasValue, setAliasValue] = useState(resume.alias || '')
  const inputRef = useRef<HTMLInputElement>(null)

  // 当进入编辑模式时，聚焦输入框
  useEffect(() => {
    if (isEditingAlias && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingAlias])

  // 保存备注
  const saveAlias = () => {
    const trimmedAlias = aliasValue.trim()
    if (trimmedAlias !== (resume.alias || '')) {
      onAliasChange?.(resume.id, trimmedAlias)
    }
    setIsEditingAlias(false)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveAlias()
    } else if (e.key === 'Escape') {
      setAliasValue(resume.alias || '')
      setIsEditingAlias(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="relative group"
    >
      {typeof index === 'number' && index > 0 && (
        <div
          className={cn(
            'absolute top-4 z-20 pointer-events-none',
            isMultiSelectMode ? 'left-12' : 'left-4'
          )}
        >
          <div
            className={cn(
              'h-7 min-w-7 px-2 rounded-none fresh:rounded-md flex items-center justify-center',
              'border border-black fresh:border-slate-200 bg-slate-100 text-slate-600',
              'text-xs font-mono font-bold tracking-tight',
              'shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none'
            )}
            title={`第 ${index} 个`}
          >
            {index}
          </div>
        </div>
      )}

      {/* 复选框容器 - 只在多选模式下显示 */}
      {isMultiSelectMode && onSelectChange && (
        <motion.div 
          className="absolute top-4 left-4 z-20"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectChange(resume.id, e.target.checked)}
            className={cn(
              "w-5 h-5 rounded-none fresh:rounded-lg border-2 fresh:border border-black fresh:border-slate-200 fresh:border-slate-200 cursor-pointer transition-all duration-200",
              "bg-white",
              "checked:bg-sky-500",
              "focus:ring-2 focus:ring-sky-500/50 outline-none"
            )}
            title="选择此简历"
          />
        </motion.div>
      )}

      <Card
        className={cn(
          "relative overflow-visible h-[340px] flex flex-col transition-[border-color,box-shadow,transform] duration-150",
          "bg-[#F2F1EA] fresh:bg-white",
          "group-hover:shadow-none fresh:group-hover:border-blue-200 fresh:group-hover:shadow-md",
          resume.pinned && "fresh:border-blue-200 fresh:shadow-[0_4px_14px_rgba(66,133,244,0.14)]",
          isMultiSelectMode && isSelected && "shadow-[4px_4px_0px_0px_#0ea5e9] border-sky-500"
        )}
      >
        <CardContent className="relative flex-1 min-h-0 pt-9 text-center flex flex-col items-center z-10">
          <motion.div
            className="mb-4 p-3 rounded-none fresh:rounded-md bg-[#E7E6DE] fresh:bg-slate-50 text-black shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none border-2 fresh:border border-black fresh:border-slate-200"
          >
            <FileText className="h-7 w-7" />
          </motion.div>

          <CardTitle className="min-h-7 max-w-full text-xl leading-7 font-sans font-semibold tracking-tight line-clamp-1 text-black fresh:text-slate-800 px-6 mb-2">
            {resume.name || "未命名简历"}
          </CardTitle>
          
          {/* 备注/别名区域 */}
          <div 
            className="px-6 mb-3 min-h-[28px] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditingAlias ? (
              <input
                ref={inputRef}
                type="text"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
                onBlur={saveAlias}
                onKeyDown={handleKeyDown}
                placeholder="添加备注..."
                className={cn(
                  "w-full max-w-[200px] px-3 py-1.5 text-sm text-center rounded-none fresh:rounded-lg font-mono",
                  "bg-white shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm",
                  "border border-black fresh:border-slate-200",
                  "text-black",
                  "focus:outline-none"
                )}
              />
            ) : (
              <button
                onClick={() => setIsEditingAlias(true)}
                className={cn(
                  "text-sm px-3 py-1 rounded-none fresh:rounded-md transition-all duration-200 font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal",
                  resume.alias
                    ? "bg-[#E5E5E0] text-black border border-black fresh:border-slate-200"
                    : "text-black/45 fresh:text-[#878E99] hover:text-black hover:bg-[#E5E5E0]"
                )}
                title="点击编辑备注"
              >
                {resume.alias || "+ 添加备注"}
              </button>
            )}
          </div>

          <div className="w-full max-w-[250px] border-t border-black/50 fresh:border-slate-100 pt-3 text-xs text-black/60 fresh:text-slate-500 font-mono fresh:font-sans normal-case tracking-normal">
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-left">
              <span>创建时间</span>
              <span className="text-right tabular-nums text-black/60 fresh:text-slate-500">
                {formatDateTime(resume.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-700 fresh:bg-emerald-600" />
                更新时间
              </span>
              <span className="text-right tabular-nums text-black/60 fresh:text-slate-500">
                {formatDateTime(resume.updatedAt)}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative z-10 mt-auto pt-0 pb-4 px-4 gap-2 flex-nowrap">
          {/* 置顶按钮 */}
          {onTogglePin && (
            <Button
              variant="ghost"
              className={cn(
                "h-10 w-10 shrink-0 p-0 rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none transition-[transform,box-shadow,background-color] duration-100 hover:translate-y-[1px] hover:translate-x-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 hover:shadow-none active:translate-y-[2px] active:translate-x-[2px] fresh:active:translate-x-0 fresh:active:translate-y-0",
                resume.pinned
                  ? "bg-[#4285F4] text-white border-[#4285F4] shadow-[2px_2px_0px_0px_rgba(66,133,244,0.5)] hover:bg-[#4285F4]"
                  : "bg-white text-black hover:bg-slate-50"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(resume.id);
              }}
              title={resume.pinned ? '取消置顶' : '置顶'}
            >
              <Pin className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 min-w-0 h-10 px-2 fresh:bg-white fresh:font-sans fresh:normal-case fresh:tracking-normal fresh:shadow-none fresh:hover:translate-x-0 fresh:hover:translate-y-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(resume.id);
            }}
          >
            编辑
          </Button>
          {onDuplicate && (
            <Button
              variant="outline"
              className="flex-1 min-w-0 h-10 px-2 inline-flex items-center justify-center gap-1 fresh:!border-slate-300 fresh:!bg-slate-100 fresh:!text-slate-800 fresh:font-sans fresh:font-medium fresh:normal-case fresh:tracking-normal fresh:shadow-none fresh:hover:!bg-slate-200 fresh:hover:translate-x-0 fresh:hover:translate-y-0"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(resume.id);
              }}
              title="复制一个一模一样的简历"
              aria-label="复制一个一模一样的简历"
            >
              <Copy className="h-4 w-4 shrink-0 max-[270px]:hidden" />
              <span className="truncate">复制</span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-10 w-10 shrink-0 p-0 rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none bg-[#F0F0E8] fresh:bg-white text-black fresh:text-slate-600 hover:bg-[#B91C1C] hover:text-white fresh:hover:bg-red-50 fresh:hover:text-red-600 transition-[transform,box-shadow,background-color] duration-100 hover:translate-y-[1px] hover:translate-x-[1px] fresh:hover:translate-x-0 fresh:hover:translate-y-0 hover:shadow-none active:translate-y-[2px] active:translate-x-[2px] fresh:active:translate-x-0 fresh:active:translate-y-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(resume.id);
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
