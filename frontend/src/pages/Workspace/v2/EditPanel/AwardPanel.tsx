/**
 * 荣誉奖项面板
 */
import { useState } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { PlusCircle, ChevronDown, Eye, Trash2, GripVertical } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { Award } from '../types'
import Field from './Field'
import {
  EDITOR_ADD_BUTTON_CLASS,
  EDITOR_CONTROL_CLASS,
  EDITOR_DRAG_HINT_CLASS,
  EDITOR_INSET_CLASS,
  EDITOR_ITEM_BODY_CLASS,
  EDITOR_ITEM_CLASS,
  EDITOR_ITEM_HEADER_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_PANEL_CLASS,
} from './editorStyles'
import MonthYearPicker from '../shared/MonthYearPicker'
import { AIImportButton } from '@/components/common/AIImportButton'

const AWARD_LEVEL_OPTIONS = ['', '校级', '省级', '市级', '国家级'] as const

interface AwardPanelProps {
  awards: Award[]
  onUpdate: (award: Award) => void
  onDelete: (id: string) => void
  onReorder: (awards: Award[]) => void
  onAIImport?: () => void
  awardsListType?: 'unordered' | 'ordered'
  onChangeAwardsListType?: (type: 'unordered' | 'ordered') => void
}

const generateId = () => {
  return `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 奖项条目组件
function AwardItem({
  award,
  onUpdate,
  onDelete,
}: {
  award: Award
  onUpdate: (award: Award) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const dragControls = useDragControls()

  const handleChange = (field: keyof Award, value: string | boolean) => {
    onUpdate({ ...award, [field]: value })
  }

  return (
    <Reorder.Item
      id={award.id}
      value={award}
      dragListener={false}
      dragControls={dragControls}
      className={cn(EDITOR_ITEM_CLASS, 'hover:border-primary', award.visible === false && 'opacity-40')}
      whileDrag={{ scale: 1.02 }}
    >
      <div className="min-w-0">
        {/* 标题行 */}
        <div
          className={cn(EDITOR_ITEM_HEADER_CLASS, expanded && 'bg-[#ECEDE9] fresh:bg-slate-50 dark:bg-neutral-800/50')}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              onPointerDown={(event) => dragControls.start(event)}
              onClick={(event) => event.stopPropagation()}
              className="-ml-1 flex w-6 shrink-0 touch-none items-center justify-center rounded-none fresh:rounded-md cursor-grab hover:bg-[#E5E5E0] fresh:hover:bg-slate-100 dark:hover:bg-neutral-800/50"
              title="拖拽调整顺序"
            >
              <GripVertical className="h-4 w-4 text-slate-400 dark:text-neutral-500" />
            </div>
            <h3 className={cn('font-medium truncate', 'text-gray-700 dark:text-neutral-200')}>
              {award.title || '未命名奖项'}
            </h3>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdate({ ...award, visible: !award.visible })
              }}
              className={cn('p-1.5 rounded-none fresh:rounded-md', 'hover:bg-[#F1F2F5] dark:hover:bg-[#2A2A2A]')}
            >
              <Eye className={cn('w-4 h-4', award.visible !== false ? 'text-primary' : 'text-gray-300')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(award.id)
              }}
              className={cn('p-1.5 rounded-none fresh:rounded-md', 'hover:bg-red-50 dark:hover:bg-red-900/50', 'text-red-600 dark:text-red-400')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
            </motion.div>
          </div>
        </div>

        {/* 展开内容 */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={EDITOR_ITEM_BODY_CLASS} onClick={(e) => e.stopPropagation()}>
                <div className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0 * 0.05, ease: 'easeOut' }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Field index={0} label="奖项名称" value={award.title} onChange={(v) => handleChange('title', v)} placeholder="如：国家奖学金" />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 1 * 0.05, ease: 'easeOut' }}
                      className="space-y-2"
                    >
                      <label className={EDITOR_LABEL_CLASS}>级别</label>
                      <select
                        value={award.issuer || ''}
                        onChange={(e) => handleChange('issuer', e.target.value)}
                        className={EDITOR_CONTROL_CLASS}
                      >
                        <option value="">请选择级别</option>
                        {AWARD_LEVEL_OPTIONS.filter((v) => v).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 2 * 0.05, ease: 'easeOut' }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <MonthYearPicker
                      label="获奖时间"
                      value={award.date || ''}
                      onChange={(v) => handleChange('date', v)}
                      placeholder="如：2023-09"
                    />
                  </motion.div>
                  <Field index={3} label="奖项描述" value={award.description || ''} onChange={(v) => handleChange('description', v)} type="textarea" placeholder="简要描述..." />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

export default function AwardPanel({
  awards,
  onUpdate,
  onDelete,
  onReorder,
  onAIImport,
  awardsListType = 'unordered',
  onChangeAwardsListType,
}: AwardPanelProps) {
  const handleCreate = () => {
    const newItem: Award = {
      id: generateId(),
      title: '新奖项',
      issuer: '',
      date: '',
      description: '',
      visible: true,
    }
    onReorder([...awards, newItem])
  }

  return (
    <div className={EDITOR_PANEL_CLASS}>
      {onAIImport && <AIImportButton onClick={onAIImport} className="w-full" />}

      <div className={cn(EDITOR_INSET_CLASS, 'flex items-center justify-between gap-3')}>
        <div className="text-sm font-medium text-gray-700 dark:text-neutral-200">
          列表样式
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeAwardsListType?.('unordered')}
            className={cn(
              'px-3 py-1.5 rounded-none fresh:rounded-md text-xs font-semibold border transition-colors',
              awardsListType === 'unordered'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white'
                : 'bg-white dark:bg-neutral-900/30 text-gray-700 dark:text-neutral-200 border-black fresh:border-slate-200 dark:border-white hover:bg-slate-50 dark:hover:bg-neutral-800/60',
            )}
          >
            无序列表
          </button>
          <button
            type="button"
            onClick={() => onChangeAwardsListType?.('ordered')}
            className={cn(
              'px-3 py-1.5 rounded-none fresh:rounded-md text-xs font-semibold border transition-colors',
              awardsListType === 'ordered'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white'
                : 'bg-white dark:bg-neutral-900/30 text-gray-700 dark:text-neutral-200 border-black fresh:border-slate-200 dark:border-white hover:bg-slate-50 dark:hover:bg-neutral-800/60',
            )}
          >
            有序列表
          </button>
        </div>
      </div>

      <div className={EDITOR_DRAG_HINT_CLASS}>
        <GripVertical className="h-3.5 w-3.5" />
        可拖拽调整顺序
      </div>

      <Reorder.Group axis="y" values={awards} onReorder={onReorder} className="space-y-3">
        {awards.map((item) => (
          <AwardItem key={item.id} award={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </Reorder.Group>

      <button
        onClick={handleCreate}
        className={EDITOR_ADD_BUTTON_CLASS}
      >
        <PlusCircle className="w-4 h-4" />
        添加荣誉奖项
      </button>
    </div>
  )
}
