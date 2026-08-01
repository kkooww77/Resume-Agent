/**
 * 自定义模块面板
 */
import { useMemo } from 'react'
import { PlusCircle, ChevronDown, Eye, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../../lib/utils'
import type { CustomItem } from '../types'
import Field from './Field'
import { EDITOR_ADD_BUTTON_CLASS, EDITOR_ITEM_BODY_CLASS, EDITOR_ITEM_CLASS, EDITOR_PANEL_CLASS } from './editorStyles'
import { MonthYearRangePicker } from '../shared/MonthYearRangePicker'

interface CustomPanelProps {
  sectionId: string
  items: CustomItem[]
  onCreate: (sectionId: string) => void
  onUpdate: (sectionId: string, item: CustomItem) => void
  onDelete: (sectionId: string, itemId: string) => void
}

function CustomItemCard({
  sectionId,
  item,
  onUpdate,
  onDelete,
}: {
  sectionId: string
  item: CustomItem
  onUpdate: (sectionId: string, item: CustomItem) => void
  onDelete: (sectionId: string, itemId: string) => void
}) {
  const expanded = useMemo(() => true, [])

  const handleChange = (field: keyof CustomItem, value: string | boolean) => {
    onUpdate(sectionId, { ...item, [field]: value })
  }

  return (
    <div
      className={cn(EDITOR_ITEM_CLASS, 'hover:border-primary', item.visible === false && 'opacity-40')}
    >
      <div className="min-w-0">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate text-gray-700 dark:text-neutral-200">
              {item.title || '未命名条目'}
            </h3>
            {item.subtitle && (
              <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => handleChange('visible', !item.visible)}
              className="p-1.5 rounded-none fresh:rounded-md hover:bg-[#F1F2F5] dark:hover:bg-[#2A2A2A]"
              title={item.visible !== false ? '隐藏条目' : '显示条目'}
            >
              <Eye className={cn('w-4 h-4', item.visible !== false ? 'text-primary' : 'text-gray-300')} />
            </button>
            <button
              onClick={() => onDelete(sectionId, item.id)}
              className="p-1.5 rounded-none fresh:rounded-md hover:bg-red-50 dark:hover:bg-red-900/50"
              title="删除条目"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
              <ChevronDown className="w-5 h-5 text-gray-500" />
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={EDITOR_ITEM_BODY_CLASS}>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    index={0}
                    label="标题"
                    value={item.title}
                    onChange={(v) => handleChange('title', v)}
                    placeholder="留空则用模块名作为标题"
                  />
                  <Field
                    index={1}
                    label="副标题"
                    value={item.subtitle || ''}
                    onChange={(v) => handleChange('subtitle', v)}
                    placeholder="请输入副标题"
                  />
                </div>
                <MonthYearRangePicker
                  label="时间"
                  value={(item.dateRange || '')
                    .split(' - ')
                    .map((s) => (s && s !== '至今' ? s.trim().replace(/\./g, '-') : s?.trim() || ''))
                    .join(' - ')}
                  onChange={(v) => handleChange('dateRange', v)}
                />
                <Field
                  index={3}
                  label="描述"
                  value={item.description || ''}
                  onChange={(v) => handleChange('description', v)}
                  type="editor"
                  placeholder="请输入内容描述..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function CustomPanel({
  sectionId,
  items,
  onCreate,
  onUpdate,
  onDelete,
}: CustomPanelProps) {
  return (
    <div className={EDITOR_PANEL_CLASS}>
      <div className="space-y-3">
        {items.map((item) => (
          <CustomItemCard
            key={item.id}
            sectionId={sectionId}
            item={item}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>

      <button
        onClick={() => onCreate(sectionId)}
        className={EDITOR_ADD_BUTTON_CLASS}
      >
        <PlusCircle className="w-4 h-4" />
        添加条目
      </button>
    </div>
  )
}
