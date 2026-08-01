/**
 * 自我评价编辑面板
 */
import { motion } from 'framer-motion'
import RichEditor from '../shared/RichEditor'
import { EDITOR_LABEL_CLASS, EDITOR_PANEL_CLASS } from './editorStyles'
import type { ResumeData } from '../../types'
import { AIImportButton } from '@/components/common/AIImportButton'

interface SelfEvaluationPanelProps {
  content: string
  onUpdate: (content: string) => void
  onAIImport?: () => void
  resumeData?: ResumeData
}

const SelfEvaluationPanel = ({ content, onUpdate, onAIImport, resumeData }: SelfEvaluationPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={EDITOR_PANEL_CLASS}
    >
      {onAIImport && (
        <AIImportButton
          onClick={onAIImport}
          className="w-full"
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1, ease: 'easeOut' }}
        className="space-y-2"
      >
        <label className={EDITOR_LABEL_CLASS}>
          自我评价
        </label>
        <RichEditor
          content={content}
          onChange={onUpdate}
          placeholder="请用 2-3 句话概括你的技术能力、优势和求职方向..."
          resumeData={resumeData}
          polishPath="selfEvaluation"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: 'easeOut' }}
        className="text-xs text-gray-400 dark:text-neutral-500"
      >
        提示：建议控制在 2-3 句话，突出技术方向、核心优势和可量化成果
      </motion.p>
    </motion.div>
  )
}

export default SelfEvaluationPanel
