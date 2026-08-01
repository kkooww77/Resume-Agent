/**
 * 工作经历面板
 */
import { PlusCircle, Wand2, GripVertical } from 'lucide-react'
import { Reorder } from 'framer-motion'
import type { Experience, GlobalSettings, ResumeData } from '../types'
import ExperienceItem from './ExperienceItem'
import { EDITOR_ADD_BUTTON_CLASS, EDITOR_PANEL_CLASS } from './editorStyles'

import { AIImportButton } from '@/components/common/AIImportButton';

interface ExperiencePanelProps {
  experiences: Experience[]
  onUpdate: (experience: Experience) => void
  onDelete: (id: string) => void
  onReorder: (experiences: Experience[]) => void
  globalSettings?: GlobalSettings
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void
  onAIImport?: () => void
  resumeData?: ResumeData  // 简历数据，用于 AI 润色
}

const generateId = () => {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const ExperiencePanel = ({
  experiences,
  onUpdate,
  onDelete,
  onReorder,
  globalSettings,
  updateGlobalSettings,
  onAIImport,
  resumeData,
}: ExperiencePanelProps) => {
  const handleCreate = () => {
    const newExp: Experience = {
      id: generateId(),
      company: '新公司',
      position: '',
      date: '',
      details: '',
      visible: true,
    }
    onReorder([...experiences, newExp])
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

      <Reorder.Group axis="y" values={experiences} onReorder={onReorder} className="space-y-3">
        {experiences.map((exp) => (
          <ExperienceItem
            key={exp.id}
            experience={exp}
            onUpdate={onUpdate}
            onDelete={onDelete}
            resumeData={resumeData}
            globalSettings={globalSettings}
            updateGlobalSettings={updateGlobalSettings}
          />
        ))}
      </Reorder.Group>

      <button
        onClick={handleCreate}
        className={EDITOR_ADD_BUTTON_CLASS}
      >
        <PlusCircle className="w-4 h-4" />
        添加实习经历
      </button>
    </div>
  )
}

export default ExperiencePanel
