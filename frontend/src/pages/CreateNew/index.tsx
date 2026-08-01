/**
 * 创建简历入口页面
 * 复刻 Resume-Matcher 弹窗布局 + Resume-Agent Swiss 风格微调：
 *  - 全屏遮罩 + 居中白底模态框
 *  - 两列卡片：左"从文件导入"、右"AI 智能生成"
 *  - 文案去英文化，贴合项目风格
 */
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FileCode,
  FileText,
  Sparkles,
  Wand2,
  Upload,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setCurrentResumeId } from '@/services/resumeStorage'
import { cn } from '@/lib/utils'

export default function CreateNew() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = location.state?.from === '/my-resumes' ? '/my-resumes' : '/'

  const handleUpload = () => {
    navigate('/my-resumes?openAIImport=1')
  }

  const handleWizard = () => {
    navigate('/my-resumes?openAIImport=1')
  }

  const handleBlank = () => {
    setCurrentResumeId(null)
    localStorage.removeItem('resume_v2_data')
    navigate('/workspace/new')
  }

  const handleClose = () => navigate(returnPath)

  return (
    <div className="min-h-screen bg-[#F0F0E8] fresh:bg-slate-50 text-black font-sans overflow-hidden">
      {/* 格子纹理背景 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* 左上角返回 */}
      <div className="fixed top-6 left-6 z-50">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleClose}
          className={cn(
            'inline-flex items-center gap-2',
            'font-mono text-xs font-bold uppercase tracking-wide fresh:font-sans fresh:normal-case fresh:tracking-normal',
            'border-2 border-black bg-[#F0F0E8] fresh:border-slate-200 fresh:bg-white',
            'shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm',
            'px-4 py-2 text-black',
            'hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none',
            'transition-[transform,box-shadow,background-color] duration-100',
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </motion.button>
      </div>

      {/* 居中模态对话框 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'w-full max-w-3xl',
            'bg-white',
            'border-2 border-black fresh:border-slate-200',
            'shadow-[8px_8px_0px_0px_#000000] fresh:shadow-xl',
            'overflow-hidden',
          )}
        >
          {/* 标题区 */}
          <div className="relative px-8 pt-7 pb-6">
            <button
              onClick={handleClose}
              aria-label="关闭"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center border border-gray-300 text-gray-400 hover:text-black hover:border-black transition-colors"
            >
              ✕
            </button>
            <div className="font-mono text-xs font-bold text-blue-700 uppercase tracking-wider fresh:font-sans fresh:normal-case fresh:tracking-normal mb-2">
              // NEW RESUME
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-black leading-tight mb-2">
              从哪里开始？
            </h2>
            <p className="text-sm text-gray-500">
              有现成简历？直接导入。没有？让 AI 帮你从零构建。
            </p>
          </div>

          {/* 两列卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-8 pb-8">
            {/* 左卡片：从文件导入 */}
            <motion.div
              whileHover={{ y: -3 }}
              className="group cursor-pointer"
              onClick={handleUpload}
            >
              <div
                className={cn(
                  'h-full border-2 border-black bg-white fresh:border-slate-200',
                  'shadow-[4px_4px_0px_0px_#000000] fresh:shadow-md',
                  'group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-none',
                  'transition-[transform,box-shadow] duration-100',
                  'flex flex-col',
                )}
              >
                <div className="p-6 pb-2">
                  <div className="w-14 h-14 flex items-center justify-center border-2 border-black bg-gray-100 shadow-[2px_2px_0px_0px_#000000] fresh:rounded-lg fresh:border-slate-200 fresh:bg-slate-100 fresh:shadow-sm">
                    <Upload className="w-7 h-7 text-black" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="px-6 pb-3">
                  <div className="text-xs font-mono text-gray-500 fresh:font-sans mb-1">已有简历文件</div>
                  <h3 className="text-2xl font-serif font-bold text-black leading-tight">
                    从文件导入
                  </h3>
                </div>

                <div className="px-6 pb-5 flex-1">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    支持 PDF、图片等格式，AI 自动解析并结构化，一次导入永久使用。
                  </p>
                </div>

                <div className="px-6 pb-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUpload()
                    }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3',
                      'border-2 border-black bg-white fresh:border-slate-200',
                      'shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm',
                      'font-mono text-sm font-bold uppercase tracking-wide text-black fresh:font-sans fresh:normal-case fresh:tracking-normal',
                      'group-hover:translate-y-[1px] group-hover:translate-x-[1px] group-hover:shadow-none',
                      'transition-[transform,box-shadow] duration-100',
                    )}
                  >
                    导入文件
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 右卡片：AI 智能生成 */}
            <motion.div
              whileHover={{ y: -3 }}
              className="group cursor-pointer"
              onClick={handleWizard}
            >
              <div
                className={cn(
                  'h-full border-2 border-black bg-white fresh:border-slate-200',
                  'shadow-[4px_4px_0px_0px_#000000] fresh:shadow-md',
                  'group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-none',
                  'transition-[transform,box-shadow] duration-100',
                  'flex flex-col',
                )}
              >
                <div className="p-6 pb-2">
                    <div className="w-14 h-14 flex items-center justify-center border-2 border-black bg-blue-700 shadow-[2px_2px_0px_0px_#000000] fresh:rounded-lg fresh:border-blue-600 fresh:shadow-sm">
                    <Wand2 className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="px-6 pb-3">
                  <div className="text-xs font-mono text-blue-700 fresh:font-sans mb-1">AI 引导式创建</div>
                  <h3 className="text-2xl font-serif font-bold text-black leading-tight">
                    AI 智能生成
                  </h3>
                </div>

                <div className="px-6 pb-5 flex-1">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    没有现成简历？回答几个问题、AI 帮你从零构建专业简历。
                  </p>
                </div>

                <div className="px-6 pb-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleWizard()
                    }}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-3',
                      'border-2 border-black bg-blue-700 fresh:border-blue-600',
                      'shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm',
                      'font-mono text-sm font-bold uppercase tracking-wide text-white fresh:font-sans fresh:normal-case fresh:tracking-normal',
                      'group-hover:translate-y-[1px] group-hover:translate-x-[1px] group-hover:shadow-none',
                      'transition-[transform,box-shadow,background-color] duration-100',
                      'hover:bg-blue-700',
                    )}
                  >
                    开始对话
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 底部 Skip */}
          <div className="px-8 pb-6 text-center border-t border-gray-200 pt-5">
            <button
              onClick={handleBlank}
              className={cn(
                'font-mono text-xs text-[#878E99] hover:text-black fresh:font-sans transition-colors',
                'underline-offset-2 hover:underline',
              )}
            >
              跳过 — 直接使用 LaTeX 模板从零创建
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
