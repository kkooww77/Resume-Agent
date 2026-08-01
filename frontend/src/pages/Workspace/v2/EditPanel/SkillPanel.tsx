/**
 * 专业技能编辑面板
 */
import { motion } from 'framer-motion'
import RichEditor from '../shared/RichEditor'
import { EDITOR_LABEL_CLASS, EDITOR_PANEL_CLASS } from './editorStyles'

import type { ResumeData } from '../../types'

import { AIImportButton } from '@/components/common/AIImportButton';

interface SkillPanelProps {
  skillContent: string
  onUpdate: (content: string) => void
  onAIImport?: () => void
  resumeData?: ResumeData
}

const SkillPanel = ({ skillContent, onUpdate, onAIImport, resumeData }: SkillPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={EDITOR_PANEL_CLASS}
    >
      {/* AI 导入按钮 */}
      {onAIImport && (
        <AIImportButton 
          onClick={onAIImport}
          className="w-full"
        />
      )}

      {/* 技能编辑器 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1, ease: 'easeOut' }}
        className="space-y-2"
      >
        <label className={EDITOR_LABEL_CLASS}>
          专业技能
        </label>
        <RichEditor
          content={skillContent}
          onChange={onUpdate}
          placeholder="请描述你的专业技能..."
          resumeData={resumeData}
          polishPath="skillContent"
        />
      </motion.div>

      {/* 提示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
        className="text-xs text-gray-400 dark:text-neutral-500"
      >
        提示：可以使用加粗突出重点技能，使用列表分类展示
      </motion.p>
    </motion.div>
  )
}

export default SkillPanel


