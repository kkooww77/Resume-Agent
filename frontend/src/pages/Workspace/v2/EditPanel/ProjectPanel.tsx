/**
 * 项目经历面板
 * 管理项目列表的增删改查
 */
import { PlusCircle, GripVertical } from 'lucide-react'
import { Reorder } from 'framer-motion'
import type { Project, GlobalSettings } from '../types'
import ProjectItem from './ProjectItem'
import { EDITOR_ADD_BUTTON_CLASS, EDITOR_PANEL_CLASS } from './editorStyles'

import type { ResumeData } from '../types'

import { AIImportButton } from '@/components/common/AIImportButton';

interface ProjectPanelProps {
  projects: Project[]
  onUpdate: (project: Project) => void
  onDelete: (id: string) => void
  onReorder: (projects: Project[]) => void
  onAIImport?: () => void  // AI 导入回调
  resumeData?: ResumeData  // 简历数据，用于 AI 润色
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

/**
 * 生成唯一 ID
 */
const generateId = () => {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const ProjectPanel = ({
  projects,
  onUpdate,
  onDelete,
  onReorder,
  onAIImport,
  resumeData,
  globalSettings,
  updateGlobalSettings,
}: ProjectPanelProps) => {
  // 创建新项目
  const handleCreate = () => {
    const newProject: Project = {
      id: generateId(),
      name: '新项目',
      role: '',
      date: '',
      description: '',
      visible: true,
    }
    onReorder([...projects, newProject])
  }

  return (
    <div
      className={EDITOR_PANEL_CLASS}
    >
      {onAIImport && <AIImportButton onClick={onAIImport} className="w-full" />}

      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400 px-1">
        <GripVertical className="w-3.5 h-3.5" />
        可拖拽调整顺序
      </div>

      {/* 项目列表 */}
      <Reorder.Group axis="y" values={projects} onReorder={onReorder} className="space-y-3">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            onUpdate={onUpdate}
            onDelete={onDelete}
            resumeData={resumeData}
            globalSettings={globalSettings}
            updateGlobalSettings={updateGlobalSettings}
          />
        ))}
      </Reorder.Group>

      {/* 添加按钮 */}
      <button
        onClick={handleCreate}
        className={EDITOR_ADD_BUTTON_CLASS}
      >
        <PlusCircle className="w-4 h-4" />
        添加项目
      </button>
    </div>
  )
}

export default ProjectPanel
