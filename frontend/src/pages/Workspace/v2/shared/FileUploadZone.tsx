import { useRef, useState } from 'react'
import { toast } from '@/lib/toast'
import { ClipboardPaste, FileText, Trash2, Upload } from 'lucide-react'
import { cn } from '../../../../lib/utils'

interface FileUploadZoneProps {
  file: File | null
  onFileSelect: (file: File | null) => void
  maxSizeMb?: number
  /** 允许的 MIME 列表 */
  acceptTypes?: string[]
  /** input accept 属性字符串 */
  acceptAttr?: string
  /** 提示文案，如「PDF / JPG / PNG」 */
  hintLabel?: string
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUploadZone({
  file,
  onFileSelect,
  maxSizeMb = 10,
  acceptTypes = ['application/pdf'],
  acceptAttr = '.pdf',
  hintLabel = 'PDF'
}: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const maxBytes = maxSizeMb * 1024 * 1024
  const isImageZone = acceptTypes.some((t) => t.startsWith('image/'))

  const validateFile = (nextFile: File) => {
    if (!acceptTypes.includes(nextFile.type)) {
      toast.error(`仅支持 ${hintLabel} 文件`)
      return false
    }
    if (nextFile.size > maxBytes) {
      toast.error(`文件过大，最大支持 ${maxSizeMb}MB`)
      return false
    }
    return true
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const nextFile = files[0]
    if (!validateFile(nextFile)) return
    onFileSelect(nextFile)
    // 重置 input value，确保下次选择同一文件能触发 onChange
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // 支持从剪贴板粘贴（聚焦上传区后 Ctrl / ⌘ + V，如截图）
  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const pastedFile = item.getAsFile()
        if (pastedFile) {
          event.preventDefault()
          if (validateFile(pastedFile)) {
            onFileSelect(pastedFile)
          }
          return
        }
      }
    }
  }

  return (
    <div className="h-full flex flex-col space-y-3">
      <div
        tabIndex={0}
        aria-label={`上传区，可点击、拖拽或粘贴 ${hintLabel}`}
        className={cn(
          'flex-1 flex flex-col justify-center rounded-none fresh:rounded-lg border-2 fresh:border border-dashed p-6 transition-colors outline-none focus-visible:border-black fresh:focus-visible:border-blue-400 dark:focus-visible:border-white',
          dragging
            ? 'border-blue-700 fresh:border-blue-400 bg-blue-50 fresh:bg-blue-50/70 dark:border-blue-400 dark:bg-blue-500/10'
            : file
              ? 'border-solid border-black fresh:border-slate-300 bg-white dark:bg-[#1C1C1C]'
              : 'border-[#878E99] fresh:border-slate-300 bg-[#F1F2F5] fresh:bg-slate-50 hover:border-black fresh:hover:border-blue-400 hover:bg-white dark:border-white/40 dark:bg-[#2A2A2A] dark:hover:border-white'
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        onPaste={handlePaste}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="flex flex-col items-center text-center">
          {file ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-[#F1F2F5] fresh:bg-slate-50 dark:bg-[#2A2A2A] dark:border-white">
                <FileText className="h-6 w-6 text-black fresh:text-blue-600 dark:text-white" />
              </div>
              <p className="mt-3 text-sm font-mono fresh:font-sans font-bold text-black fresh:text-slate-900 dark:text-white">
                {file.name}
              </p>
              <p className="mt-1 text-xs font-mono fresh:font-sans text-[#878E99] fresh:text-slate-500 dark:text-neutral-400">
                {formatFileSize(file.size)}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white px-4 py-2 text-xs font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-black fresh:text-slate-700 transition-colors hover:bg-[#F1F2F5] fresh:hover:bg-slate-50 dark:bg-[#1C1C1C] dark:border-white dark:text-white dark:hover:bg-[#2A2A2A]"
                >
                  更换文件
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect(null);
                    if (inputRef.current) {
                      inputRef.current.value = '';
                    }
                  }}
                  className="rounded-none fresh:rounded-md border border-black fresh:border-red-200 bg-white px-4 py-2 text-xs font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-red-600 transition-colors hover:bg-red-50 dark:bg-[#1C1C1C] dark:border-white dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  清除
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-none fresh:rounded-lg border border-black fresh:border-slate-200 bg-white fresh:bg-slate-50 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-none dark:bg-[#1C1C1C] dark:border-white dark:shadow-[2px_2px_0px_0px_#ffffff]">
                <Upload className="h-6 w-6 text-black fresh:text-blue-600 dark:text-white" />
              </div>
              <p className="mt-3 text-base font-mono fresh:font-sans font-bold text-black fresh:text-slate-900 dark:text-white">
                点击或拖拽 {hintLabel} 到此处上传
              </p>
              <p className="mt-1 text-xs font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-[#878E99] fresh:text-slate-400 dark:text-neutral-400">
                单个文件最大支持 {maxSizeMb}MB
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white px-4 py-2 text-xs font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-black fresh:text-slate-700 transition-colors hover:bg-[#F1F2F5] fresh:hover:bg-slate-50 dark:bg-[#1C1C1C] dark:border-white dark:text-white dark:hover:bg-[#2A2A2A]"
              >
                选择文件
              </button>
              <div className="mt-4 flex items-center gap-1.5 rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white fresh:bg-slate-50 px-3 py-1.5 text-xs font-mono fresh:font-sans text-black fresh:text-slate-500 dark:bg-[#1C1C1C] dark:border-white dark:text-white">
                <ClipboardPaste className="h-3.5 w-3.5 shrink-0" />
                <span className="inline-flex items-center gap-1">
                  {isImageZone ? '截图 / 图片' : '文件'}可直接
                  <kbd className="rounded-none fresh:rounded-sm border border-black fresh:border-slate-300 bg-[#F1F2F5] fresh:bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-black fresh:text-slate-600 dark:border-white dark:bg-[#2A2A2A] dark:text-white">
                    ⌘ / Ctrl + V
                  </kbd>
                  粘贴
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 移除底部的重复显示 */}
    </div>
  )
}

export default FileUploadZone
