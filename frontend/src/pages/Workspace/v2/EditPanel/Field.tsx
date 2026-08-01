/**
 * 通用字段组件
 * 支持 text、textarea、date、editor 类型
 * 支持 formatButtons 添加格式按钮（如加粗）
 */
import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../../../lib/utils'
import RichEditor from '../shared/RichEditor'
import BoldInput from './BoldInput'
import { EDITOR_CONTROL_CLASS, EDITOR_LABEL_CLASS } from './editorStyles'

import type { ResumeData, Education } from '../types'

interface FieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'textarea' | 'date' | 'editor'
  className?: string
  formatButtons?: ('bold')[]  // 支持的格式按钮
  resumeData?: ResumeData  // 简历数据，用于 AI 润色
  polishPath?: string  // JSON 路径，例如 "projects.0.description"
  educationData?: Partial<Education>  // 教育经历数据，用于 AI 帮写
  index?: number  // 用于级联动画延迟
  rightActions?: React.ReactNode
  controlsLayout?: 'overlay' | 'below'
  labelExtra?: React.ReactNode  // 标签行右侧附加控件（如字段显示样式切换）
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  formatButtons,
  resumeData,
  polishPath,
  educationData,
  index = 0,
  rightActions,
  controlsLayout = 'overlay',
  labelExtra,
}: FieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  // 级联入场动画
  const fieldAnimation = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay: index * 0.04, ease: 'easeOut' }
  }

  // 富文本编辑器
  if (type === 'editor') {
    return (
      <motion.div {...fieldAnimation} className="space-y-2">
        {label && (
          <label className={EDITOR_LABEL_CLASS}>
            {label}
          </label>
        )}
        <RichEditor
          content={value}
          onChange={onChange}
          placeholder={placeholder}
          resumeData={resumeData}
          polishPath={polishPath}
          educationData={educationData}
        />
      </motion.div>
    )
  }

  // 多行文本
  if (type === 'textarea') {
    return (
      <motion.div {...fieldAnimation} className="space-y-2">
        {label && (
          <label className={EDITOR_LABEL_CLASS}>
            {label}
          </label>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            EDITOR_CONTROL_CLASS,
            'resize-none',
            className
          )}
        />
      </motion.div>
    )
  }

  // 日期
  if (type === 'date') {
    return (
      <motion.div {...fieldAnimation} className="space-y-2">
        {label && (
          <label className={EDITOR_LABEL_CLASS}>
            {label}
          </label>
        )}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            EDITOR_CONTROL_CLASS,
            className
          )}
        />
      </motion.div>
    )
  }

  // 单行文本（默认）
  // 如果支持加粗格式，使用 BoldInput 组件
  if (formatButtons?.includes('bold')) {
    return (
      <motion.div {...fieldAnimation}>
        <BoldInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          label={label}
          rightActions={rightActions}
          controlsLayout={controlsLayout}
        />
      </motion.div>
    )
  }

  return (
    <motion.div {...fieldAnimation} className="space-y-2">
      {labelExtra ? (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label className={EDITOR_LABEL_CLASS}>
              {label}
            </label>
          )}
          {labelExtra}
        </div>
      ) : (
        label && (
          <label className={EDITOR_LABEL_CLASS}>
            {label}
          </label>
        )
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          EDITOR_CONTROL_CLASS,
          className
        )}
      />
    </motion.div>
  )
}

export default Field
