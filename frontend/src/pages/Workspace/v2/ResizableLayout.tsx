/**
 * 可拖拽三列布局组件
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import CustomScrollbar from '../../../components/common/CustomScrollbar'
import SidePanel from './SidePanel'
import EditPanel from './EditPanel'
import PreviewPanel from './PreviewPanel'
import type { ResumeData, MenuSection, GlobalSettings, BasicInfo, Project, Experience, Education, OpenSource, Award } from './types'

interface ResizableLayoutProps {
  resumeData: ResumeData
  activeSection: string
  setActiveSection: (id: string) => void
  toggleSectionVisibility: (id: string) => void
  updateMenuSections: (sections: MenuSection[]) => void
  reorderSections: (sections: MenuSection[]) => void
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void
  addCustomSection: () => void
  updateBasicInfo: (info: Partial<BasicInfo>) => void
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void
  reorderProjects: (projects: Project[]) => void
  updateExperience: (experience: Experience) => void
  deleteExperience: (id: string) => void
  reorderExperiences: (experiences: Experience[]) => void
  updateWorkExperience?: (experience: Experience) => void
  deleteWorkExperience?: (id: string) => void
  reorderWorkExperiences?: (experiences: Experience[]) => void
  updateEducation: (education: Education) => void
  deleteEducation: (id: string) => void
  reorderEducations: (educations: Education[]) => void
  updateOpenSource: (openSource: OpenSource) => void
  deleteOpenSource: (id: string) => void
  reorderOpenSources: (openSources: OpenSource[]) => void
  updateAward: (award: Award) => void
  deleteAward: (id: string) => void
  reorderAwards: (awards: Award[]) => void
  updateSelfEvaluation: (content: string) => void
  updateSkillContent: (content: string) => void
  handleAIImport: (section: string) => void
  pdfBlob: Blob | null
  loading: boolean
  progress: string
  handleRender: () => void
  handleDownload: () => void
  setResumeData: (updater: ResumeData | ((prev: ResumeData) => ResumeData)) => void
}

// 拖拽分隔线组件
function DragHandle({ 
  onDrag, 
  className 
}: { 
  onDrag: (delta: number) => void
  className?: string 
}) {
  const isDragging = useRef(false)
  const startX = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      startX.current = e.clientX
      onDrag(delta)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onDrag])

  return (
    <div
      className={cn(
        'w-1 cursor-ew-resize group relative shrink-0',
        'hover:bg-indigo-300 dark:hover:bg-indigo-600',
        'active:bg-indigo-400 dark:active:bg-indigo-500',
        className
      )}
      style={{
        cursor: 'ew-resize',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 扩大可点击区域 */}
      <div className="absolute inset-y-0 -left-2 -right-2 cursor-ew-resize" />
    </div>
  )
}

export default function ResizableLayout(props: ResizableLayoutProps) {
  const {
    resumeData,
    activeSection,
    setActiveSection,
    toggleSectionVisibility,
    updateMenuSections,
    reorderSections,
    updateGlobalSettings,
    addCustomSection,
    updateBasicInfo,
    updateProject,
    deleteProject,
    reorderProjects,
    updateExperience,
    deleteExperience,
    reorderExperiences,
    updateWorkExperience,
    deleteWorkExperience,
    reorderWorkExperiences,
    updateEducation,
    deleteEducation,
    reorderEducations,
    updateOpenSource,
    deleteOpenSource,
    reorderOpenSources,
  updateAward,
  deleteAward,
  reorderAwards,
  updateSelfEvaluation,
    updateSkillContent,
    handleAIImport,
    pdfBlob,
    loading,
    progress,
    handleRender,
    handleDownload,
    setResumeData,
  } = props

  // 列宽状态
  const [col1Width, setCol1Width] = useState(350)
  // 第二列固定宽度，第三列占据剩余空间
  const [col2Width, setCol2Width] = useState(1000) // 第二列宽度（可拖动调整）

  // 添加窗口宽度状态用于计算第三列宽度
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 初始输出布局信息
  useEffect(() => {
    const viewportWidth = window.innerWidth
    const col3Width = viewportWidth - col1Width - col2Width - 6
    console.log('=== 当前布局信息 ===')
    console.log(`窗口宽度: ${viewportWidth}px`)
    console.log(`第一列 (SidePanel): ${col1Width}px`)
    console.log(`第二列 (EditPanel): ${col2Width}px`)
    console.log(`第三列 (PreviewPanel): ${col3Width}px (自动占据)`)
    console.log(`分割线1位置: ${col1Width}px`)
    console.log(`分割线2位置: ${col1Width + col2Width + 3}px`)
    console.log('==================')
  }, [])

  // 拖拽处理
  const handleDrag1 = useCallback((delta: number) => {
    setCol1Width(w => Math.max(250, Math.min(500, w + delta)))
  }, [])

  const handleDrag2 = useCallback((delta: number) => {
    // 拖拽分隔线2时，只调整第二列的宽度
    // 向右拖动（delta > 0）：第二列变宽
    // 向左拖动（delta < 0）：第二列变窄
    setCol2Width(prevWidth => {
      const newCol2Width = prevWidth + delta

      // 计算第三列宽度
      const viewportWidth = window.innerWidth
      const headerHeight = 64 // 头部高度
      const availableWidth = viewportWidth
      const col3Width = availableWidth - col1Width - newCol2Width - 6 // 减去分割线宽度(2个 * 3px)

      // 限制第二列的宽度范围（500-1000px）
      if (newCol2Width >= 500 && newCol2Width <= 1000) {
        // 输出详细信息
        console.log('=== 拖拽分割线2 ===')
        console.log(`拖动距离: ${delta > 0 ? '+' : ''}${delta}px`)
        console.log(`窗口宽度: ${viewportWidth}px`)
        console.log(`第一列: ${col1Width}px`)
        console.log(`第二列: ${prevWidth}px → ${newCol2Width}px`)
        console.log(`第三列: ${col3Width}px (自动计算)`)
        console.log(`分割线位置: ${col1Width + newCol2Width + 3}px (从左侧)`)
        console.log('==================')

        return newCol2Width
      }

      console.log('超出范围，保持原宽度')
      return prevWidth
    })
  }, [col1Width])

  return (
    <div className="h-[calc(100vh-64px)] flex relative z-10 overflow-hidden">
      {/* 第一列：SidePanel */}
      <CustomScrollbar 
        className={cn(
          "h-full shrink-0",
          "bg-white/60 dark:bg-slate-900/60",
          "backdrop-blur-sm",
          "border-r border-white/30 dark:border-slate-700/30"
        )}
        style={{ width: col1Width }}
      >
        <SidePanel
          menuSections={resumeData.menuSections}
          activeSection={activeSection}
          globalSettings={resumeData.globalSettings}
          setActiveSection={setActiveSection}
          toggleSectionVisibility={toggleSectionVisibility}
          updateMenuSections={updateMenuSections}
          reorderSections={reorderSections}
          updateGlobalSettings={updateGlobalSettings}
          addCustomSection={addCustomSection}
        />
      </CustomScrollbar>

      {/* 分隔线1 */}
      <DragHandle onDrag={handleDrag1} />

      {/* 第二列：EditPanel - 改为固定宽度 */}
      <CustomScrollbar
        className={cn(
          "h-full shrink-0",
          "bg-white/80 dark:bg-slate-900/80",
          "backdrop-blur-sm"
        )}
        style={{ width: col2Width }}
      >
        <EditPanel
          activeSection={activeSection}
          menuSections={resumeData.menuSections}
          resumeData={resumeData}
          updateBasicInfo={updateBasicInfo}
          updateProject={updateProject}
          deleteProject={deleteProject}
          reorderProjects={reorderProjects}
          updateExperience={updateExperience}
          deleteExperience={deleteExperience}
          reorderExperiences={reorderExperiences}
          updateWorkExperience={updateWorkExperience}
          deleteWorkExperience={deleteWorkExperience}
          reorderWorkExperiences={reorderWorkExperiences}
          updateEducation={updateEducation}
          deleteEducation={deleteEducation}
          reorderEducations={reorderEducations}
          updateOpenSource={updateOpenSource}
          deleteOpenSource={deleteOpenSource}
          reorderOpenSources={reorderOpenSources}
          updateAward={updateAward}
          deleteAward={deleteAward}
          reorderAwards={reorderAwards}
          updateSelfEvaluation={updateSelfEvaluation}
          updateSkillContent={updateSkillContent}
          updateMenuSections={updateMenuSections}
          setResumeData={setResumeData}
          updateGlobalSettings={updateGlobalSettings}
          onAIImport={handleAIImport}
        />
      </CustomScrollbar>

      {/* 分隔线2（第二列和第三列之间） */}
      <DragHandle onDrag={handleDrag2} />

      {/* 第三列：PreviewPanel - 自动占据剩余所有空间到浏览器右边界 */}
      <div
        className={cn(
          "h-full overflow-hidden flex-1",  // 使用 flex-1 自动占据剩余空间
          "bg-slate-100/80 dark:bg-slate-800/80",
          "backdrop-blur-sm",
          "border-l border-white/30 dark:border-slate-700/30"
        )}
      >
        <PreviewPanel
          pdfBlob={pdfBlob}
          loading={loading}
          progress={progress}
          onRender={handleRender}
          onDownload={handleDownload}
        />
      </div>
    </div>
  )
}
