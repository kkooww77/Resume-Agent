/**
 * 开源经历面板
 */
import { useState } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { PlusCircle, ChevronDown, Eye, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { OpenSource, GlobalSettings, ResumeData } from '../types'
import { AIImportButton } from '@/components/common/AIImportButton'
import Field from './Field'
import {
  EDITOR_ADD_BUTTON_CLASS,
  EDITOR_ITEM_BODY_CLASS,
  EDITOR_ITEM_CLASS,
  EDITOR_ITEM_HEADER_CLASS,
  EDITOR_LABEL_CLASS,
  EDITOR_PANEL_CLASS,
} from './editorStyles'
import { MonthYearRangePicker } from '../shared/MonthYearRangePicker'

interface OpenSourcePanelProps {
  openSources: OpenSource[]
  onUpdate: (openSource: OpenSource) => void
  onDelete: (id: string) => void
  onReorder: (openSources: OpenSource[]) => void
  onAIImport?: () => void
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

const generateId = () => {
  return `opensource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 开源经历条目组件
function OpenSourceItem({
  openSource,
  onUpdate,
  onDelete,
  resumeData,
  globalSettings,
  updateGlobalSettings,
}: {
  openSource: OpenSource
  onUpdate: (openSource: OpenSource) => void
  onDelete: (id: string) => void
  resumeData?: ResumeData
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showCustomLabel, setShowCustomLabel] = useState(false)
  const dragControls = useDragControls()

  const handleChange = (field: keyof OpenSource, value: string | boolean) => {
    onUpdate({ ...openSource, [field]: value })
  }

  return (
    <Reorder.Item
      id={openSource.id}
      value={openSource}
      dragListener={false}
      dragControls={dragControls}
      className={cn(EDITOR_ITEM_CLASS, 'hover:border-primary', openSource.visible === false && 'opacity-40')}
      whileDrag={{ scale: 1.02 }}
    >
      <div className="min-w-0">
        {/* 标题行 */}
        <div
          className={cn(EDITOR_ITEM_HEADER_CLASS, expanded && 'bg-[#ECEDE9] fresh:bg-slate-50 dark:bg-neutral-800/50')}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {/* 拖拽手柄 */}
            <div
              onPointerDown={(event) => dragControls.start(event)}
              className={cn(
                'w-6 -ml-1 mr-0 flex items-center justify-center touch-none shrink-0',
                'cursor-grab hover:bg-[#F1F2F5] dark:hover:bg-neutral-800/50 rounded'
              )}
            >
              <GripVertical className={cn('w-4 h-4', 'text-gray-300 dark:text-neutral-600')} />
            </div>
            <h3 className={cn('font-medium truncate', 'text-gray-700 dark:text-neutral-200')}>
              {openSource.name || '未命名项目'}
            </h3>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdate({ ...openSource, visible: !openSource.visible })
              }}
              className={cn('p-1.5 rounded-none fresh:rounded-md', 'hover:bg-[#F1F2F5] dark:hover:bg-[#2A2A2A]')}
            >
              <Eye className={cn('w-4 h-4', openSource.visible !== false ? 'text-primary' : 'text-gray-300')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(openSource.id)
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
                    <Field index={0} label="项目名称" value={openSource.name} onChange={(v) => handleChange('name', v)} placeholder="如：Seata-go" />
                    <Field index={1} label="角色" value={openSource.role || ''} onChange={(v) => handleChange('role', v)} placeholder="如：贡献者" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 2 * 0.05, ease: 'easeOut' }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 2 * 0.05, ease: 'easeOut' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className={EDITOR_LABEL_CLASS}>仓库地址</label>
                        {updateGlobalSettings && (
                          <div className="flex items-center gap-1 bg-[#F1F2F5] dark:bg-[#2A2A2A] rounded-none fresh:rounded-md p-0.5">
                            {([
                              { value: 'below', label: '下方' },
                              { value: 'inline', label: '右侧' },
                              { value: 'icon', label: '图标' },
                            ] as const).map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => updateGlobalSettings({ openSourceRepoDisplay: opt.value })}
                                className={cn(
                                  'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
                                  (globalSettings?.openSourceRepoDisplay || 'below') === opt.value
                                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm dark:shadow-[2px_2px_0px_0px_#ffffff]'
                                    : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Field index={2} value={openSource.repo || ''} onChange={(v) => handleChange('repo', v)} placeholder="GitHub 链接" />
                      {/* 链接前缀设置（图标模式下不显示） */}
                      {updateGlobalSettings && globalSettings?.openSourceRepoDisplay !== 'icon' && (
                        <div className="mt-2">
                          <label className="text-[10px] text-gray-400 dark:text-neutral-500 mb-1 block">链接前缀</label>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { value: '', label: '无前缀' },
                              { value: '仓库', label: '仓库' },
                              { value: 'GitHub', label: 'GitHub' },
                            ].map((opt) => {
                              const current = globalSettings?.openSourceRepoLabel ?? '仓库'
                              const isActive = !showCustomLabel && current === opt.value
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => {
                                    setShowCustomLabel(false)
                                    updateGlobalSettings({ openSourceRepoLabel: opt.value })
                                  }}
                                  className={cn(
                                    'px-2 py-0.5 text-[10px] font-medium rounded transition-all border',
                                    isActive
                                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                                      : 'border-black fresh:border-slate-200 dark:border-white text-gray-400 dark:text-neutral-500 hover:border-black fresh:hover:border-slate-300'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                            <button
                              onClick={() => setShowCustomLabel(true)}
                              className={cn(
                                'px-2 py-0.5 text-[10px] font-medium rounded transition-all border',
                                showCustomLabel
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                                  : 'border-black fresh:border-slate-200 dark:border-white text-gray-400 dark:text-neutral-500 hover:border-black fresh:hover:border-slate-300'
                              )}
                            >
                              自定义
                            </button>
                            {showCustomLabel && (
                              <input
                                type="text"
                                value={globalSettings?.openSourceRepoLabel ?? '仓库'}
                                onChange={(e) => updateGlobalSettings({ openSourceRepoLabel: e.target.value })}
                                placeholder="输入前缀"
                                className="px-2 py-0.5 text-[10px] w-20 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-[#2A2A2A] text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 3 * 0.05, ease: 'easeOut' }}
                    >
                      <MonthYearRangePicker
                        label="时间"
                        value={(openSource.date || '')
                          .split(' - ')
                          .map((s) => (s && s !== '至今' ? s.trim().replace(/\./g, '-') : s?.trim() || ''))
                          .join(' - ')}
                        onChange={(v) => handleChange('date', v)}
                      />
                    </motion.div>
                  </motion.div>
                  <Field
                    index={4}
                    label="贡献描述"
                    value={openSource.description}
                    onChange={(v) => handleChange('description', v)}
                    type="editor"
                    placeholder="描述你的开源贡献..."
                    resumeData={resumeData}
                    polishPath={resumeData?.openSource ? `openSource[${resumeData.openSource.findIndex(os => os.id === openSource.id)}].description` : undefined}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

export default function OpenSourcePanel({ openSources, onUpdate, onDelete, onReorder, onAIImport, resumeData, globalSettings, updateGlobalSettings }: OpenSourcePanelProps) {
  const handleCreate = () => {
    const newItem: OpenSource = {
      id: generateId(),
      name: '新开源项目',
      role: '',
      repo: '',
      date: '',
      description: '',
      visible: true,
    }
    onReorder([...openSources, newItem])
  }

  return (
    <div className={EDITOR_PANEL_CLASS}>
      {onAIImport && (
        <AIImportButton
          onClick={onAIImport}
          className="w-full"
        />
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400 px-1">
        <GripVertical className="w-3.5 h-3.5" />
        可拖拽调整顺序
      </div>

      <Reorder.Group axis="y" values={openSources} onReorder={onReorder} className="space-y-3">
        {openSources.map((item) => (
          <OpenSourceItem key={item.id} openSource={item} onUpdate={onUpdate} onDelete={onDelete} resumeData={resumeData} globalSettings={globalSettings} updateGlobalSettings={updateGlobalSettings} />
        ))}
      </Reorder.Group>

      <button
        onClick={handleCreate}
        className={EDITOR_ADD_BUTTON_CLASS}
      >
        <PlusCircle className="w-4 h-4" />
        添加开源经历
      </button>
    </div>
  )
}
