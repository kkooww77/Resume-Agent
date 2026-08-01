/**
 * 项目经历条目组件
 * 支持拖拽排序、展开/收起、显示/隐藏、删除
 */
import { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { ChevronDown, Eye, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { Project, ResumeData, GlobalSettings } from '../types'
import Field from './Field'
import { EDITOR_ITEM_BODY_CLASS, EDITOR_ITEM_CLASS, EDITOR_ITEM_HEADER_CLASS, EDITOR_LABEL_CLASS } from './editorStyles'
import { MonthYearRangePicker } from '../shared/MonthYearRangePicker'

interface ProjectItemProps {
  project: Project
  onUpdate: (project: Project) => void
  onDelete: (id: string) => void
  resumeData?: ResumeData
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

/**
 * 项目编辑表单
 */
const ProjectEditor = ({
  project,
  onSave,
  resumeData,
  globalSettings,
  updateGlobalSettings,
}: {
  project: Project
  onSave: (project: Project) => void
  resumeData?: ResumeData
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}) => {
  const [showCustomLabel, setShowCustomLabel] = useState(false)

  const handleChange = (field: keyof Project, value: string | boolean) => {
    onSave({
      ...project,
      [field]: value,
    })
  }

  // 构建 polishPath，使用方括号格式：projects[0].description
  const polishPath = resumeData?.projects
    ? `projects[${resumeData.projects.findIndex(p => p.id === project.id)}].description`
    : undefined

  return (
    <div className="space-y-5">
      <div className="grid gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0 * 0.05, ease: 'easeOut' }}
          className="grid grid-cols-2 gap-4"
        >
          <Field
            index={0}
            label="项目名称"
            value={project.name}
            onChange={(value) => handleChange('name', value)}
            placeholder="请输入项目名称"
          />
          <Field
            index={1}
            label="项目角色"
            value={project.role}
            onChange={(value) => handleChange('role', value)}
            placeholder="请输入你的角色"
          />
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
              <label className={EDITOR_LABEL_CLASS}>项目链接</label>
              {updateGlobalSettings && (
                <div className="flex items-center gap-1 bg-[#F1F2F5] dark:bg-[#2A2A2A] rounded-none fresh:rounded-md p-0.5">
                  {([
                    { value: 'below', label: '下方' },
                    { value: 'inline', label: '右侧' },
                    { value: 'icon', label: '图标' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateGlobalSettings({ projectLinkDisplay: opt.value })}
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-medium rounded transition-all',
                        (globalSettings?.projectLinkDisplay || 'inline') === opt.value
                          ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field
              index={2}
              value={project.link || ''}
              onChange={(value) => handleChange('link', value)}
              placeholder="GitHub 链接"
            />
            {updateGlobalSettings && globalSettings?.projectLinkDisplay !== 'icon' && (
              <div className="mt-2">
                <label className="text-[10px] text-gray-400 dark:text-neutral-500 mb-1 block">链接前缀</label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { value: '', label: '无前缀' },
                    { value: '链接', label: '链接' },
                    { value: 'GitHub', label: 'GitHub' },
                  ].map((opt) => {
                    const current = globalSettings?.projectLinkLabel ?? '链接'
                    const isActive = !showCustomLabel && current === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setShowCustomLabel(false)
                          updateGlobalSettings({ projectLinkLabel: opt.value })
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
                        : 'border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-neutral-500 hover:border-gray-300'
                    )}
                  >
                    自定义
                  </button>
                  {showCustomLabel && (
                    <input
                      type="text"
                      value={globalSettings?.projectLinkLabel ?? '链接'}
                      onChange={(e) => updateGlobalSettings({ projectLinkLabel: e.target.value })}
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
              label="项目时间"
              value={(project.date || '')
                .split(' - ')
                .map((s) => (s && s !== '至今' ? s.trim().replace(/\./g, '-') : s?.trim() || ''))
                .join(' - ')}
              onChange={(value) => handleChange('date', value)}
            />
          </motion.div>
        </motion.div>
        <Field
          index={4}
          label="项目描述"
          value={project.description}
          onChange={(value) => handleChange('description', value)}
          type="editor"
          placeholder="请描述你在项目中的工作内容..."
          resumeData={resumeData}
          polishPath={polishPath}
        />
      </div>
    </div>
  )
}

const ProjectItem = ({
  project,
  onUpdate,
  onDelete,
  resumeData,
  globalSettings,
  updateGlobalSettings,
}: ProjectItemProps) => {
  const [expanded, setExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const dragControls = useDragControls()

  const handleVisibilityToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isUpdating) return

      setIsUpdating(true)
      setTimeout(() => {
        onUpdate({
          ...project,
          visible: !project.visible,
        })
        setIsUpdating(false)
      }, 10)
    },
    [project, onUpdate, isUpdating]
  )

  return (
    <Reorder.Item
      id={project.id}
      value={project}
      dragListener={false}
      dragControls={dragControls}
      className={cn(EDITOR_ITEM_CLASS, 'hover:border-primary', !project.visible && 'opacity-40')}
      whileDrag={{ scale: 1.02 }}
    >
      <div className="min-w-0">
        {/* 标题行 */}
        <div
          className={cn(
            EDITOR_ITEM_HEADER_CLASS,
            expanded && 'bg-[#ECEDE9] fresh:bg-slate-50 dark:bg-neutral-800/50'
          )}
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
            <h3
              className={cn(
                'font-medium truncate',
                'text-gray-700 dark:text-neutral-200'
              )}
            >
              {project.name || '未命名项目'}
            </h3>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {/* 显示/隐藏 */}
            <button
              disabled={isUpdating}
              onClick={handleVisibilityToggle}
              className={cn(
                'p-1.5 rounded-none fresh:rounded-md',
                'hover:bg-[#F1F2F5] dark:hover:bg-[#2A2A2A]'
              )}
            >
              <Eye className={cn('w-4 h-4', project.visible ? 'text-primary' : 'text-gray-300')} />
            </button>

            {/* 删除 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(project.id)
              }}
              className={cn(
                'p-1.5 rounded-none fresh:rounded-md',
                'hover:bg-red-50 dark:hover:bg-red-900/50',
                'text-red-600 dark:text-red-400'
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* 展开/收起 */}
            <motion.div
              initial={false}
              animate={{ rotate: expanded ? 180 : 0 }}
            >
              <ChevronDown
                className={cn(
                  'w-5 h-5',
                  'text-gray-500 dark:text-neutral-400'
                )}
              />
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
                <ProjectEditor
                  project={project}
                  onSave={onUpdate}
                  resumeData={resumeData}
                  globalSettings={globalSettings}
                  updateGlobalSettings={updateGlobalSettings}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

export default ProjectItem
