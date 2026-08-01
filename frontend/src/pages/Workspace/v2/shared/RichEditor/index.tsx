/**
 * 富文本编辑器组件
 * 基于 TipTap，支持加粗、斜体、下划线、列表等格式
 * 输出 HTML 格式，后端转换为 LaTeX
 */
import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Wand2,
  SpellCheck,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '../../../../../lib/utils'
import { BetterSpace } from './BetterSpace'
import PolishChatDialog from '../PolishChatDialog'
import { ensureSkillBulletList } from '../../utils/ensureBulletList'
import GrammarCheckDialog from '../GrammarCheckDialog'

import AIWriteDialog from '../AIWriteDialog'
import type { ResumeData, Education } from '../../types'
import { setActiveSelection } from '../activeSelectionStore'
import { EDITOR_COMPOSITE_CONTROL_CLASS } from '../../EditPanel/editorStyles'
import './tiptap.css'


// Debug logging disabled in production
const logDebug = (_message: string, _data?: Record<string, any>) => {}
// #endregion agent log helper

const logBoldDebugSnapshot = (editor: Editor, phase: 'before' | 'after') => {
  try {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    const selectedSlice = editor.state.doc.slice(from, to).toJSON()
    const html = editor.getHTML()
    const compactHtml = html.length > 1200 ? `${html.slice(0, 1200)}...<truncated>` : html
    console.log(`[BOLD DEBUG][${phase}]`, {
      from,
      to,
      selectedText,
      selectedSlice,
      compactHtml,
    })
  } catch (error) {
    console.error(`[BOLD DEBUG][${phase}] snapshot failed`, error)
  }
}

const getListItemNestingLevel = (editor: Editor): number => {
  const { $from } = editor.state.selection
  let level = 0
  for (let depth = 0; depth <= $from.depth; depth++) {
    if ($from.node(depth).type.name === 'listItem') level += 1
  }
  return level
}

const LimitedListItem = ListItem.extend({
  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() ?? {}
    return {
      ...parentShortcuts,
      Tab: () => {
        if (!this.editor.isActive('listItem')) return false
        if (getListItemNestingLevel(this.editor) >= 2) return true
        return this.editor.commands.sinkListItem(this.name)
      },
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    }
  },
})

interface RichEditorProps {
  content?: string
  onChange: (content: string) => void
  placeholder?: string
  onPolish?: () => void  // AI 润色回调（已废弃，使用内置润色）
  resumeData?: ResumeData  // 简历数据，用于 AI 润色
  polishPath?: string  // JSON 路径，例如 "skillContent" 或 "projects.0.description"
  educationData?: Partial<Education>  // 教育经历数据，用于 AI 帮写
}

/**
 * 工具栏按钮
 */
interface MenuButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  tooltip?: string
}

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  tooltip,
}: MenuButtonProps) => {
  const [showTooltip, setShowTooltip] = React.useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'h-9 w-9 rounded-none fresh:rounded-md border border-transparent p-0 flex items-center justify-center transition-colors duration-200',
          isActive
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
            : 'hover:bg-gray-100 dark:hover:bg-neutral-800',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {children}
      </button>
      {tooltip && showTooltip && (
        <div
          className={cn(
            'absolute -bottom-8 left-1/2 transform -translate-x-1/2',
            'px-2 py-1 text-xs rounded-md whitespace-nowrap z-50',
            'bg-gray-800 text-white dark:bg-neutral-700'
          )}
        >
          {tooltip}
        </div>
      )}
    </div>
  )
}

const RichEditor = ({
  content = '',
  onChange,
  onPolish,
  resumeData,
  polishPath = 'skillContent',
  educationData,
}: RichEditorProps) => {
  const [showPolishDialog, setShowPolishDialog] = useState(false)
  const [showGrammarDialog, setShowGrammarDialog] = useState(false)
  const [showAIWriteDialog, setShowAIWriteDialog] = useState(false)
  // 始终指向最新 onChange，防止 Tiptap onUpdate 捕获旧闭包
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // 空内容拦截：避免空字段白跑一次 AI
  const isContentEmpty = () =>
    !(content || '').replace(/<[^>]+>/g, '').trim()

  const handlePolish = () => {
    if (isContentEmpty()) {
      toast('先填写一些内容，再让 AI 帮你润色～')
      return
    }
    if (resumeData) {
      setShowPolishDialog(true)
    } else if (onPolish) {
      // 兼容旧的 onPolish 回调
      onPolish()
    }
  }

  // 专业技能：应用润色时兜底强制无序列表（对话框完成时已格式化，此处幂等保护）
  const handleApplyPolish = (polishedContent: string) => {
    onChange(
      polishPath === 'skillContent'
        ? ensureSkillBulletList(polishedContent)
        : polishedContent,
    )
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        underline: false,  // 禁用 StarterKit 中的 underline，使用单独的 Underline 扩展
        heading: {
          levels: [1, 2, 3],
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'custom-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'custom-list-ordered',
        },
      }),
      LimitedListItem,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TextStyle,
      Underline,
      Color,
      Highlight.configure({ multicolor: true }),
      BetterSpace,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
    },
    // 选中非空文本时推入全局选区通道，供右下角 AI 助手"引用选中 + 划词改写"使用
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, '\n')
      if (from >= to || text.trim().length < 2) return
      let html = ''
      const domSelection = window.getSelection()
      if (domSelection && domSelection.rangeCount > 0) {
        const container = document.createElement('div')
        container.appendChild(domSelection.getRangeAt(0).cloneContents())
        html = container.innerHTML
      }
      setActiveSelection({ editor, from, to, text, html: html || text, bold: editor.isActive('bold'), path: polishPath })
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3',
          'dark:prose-invert',
          'dark:prose-headings:text-neutral-200',
          'dark:prose-p:text-neutral-300',
          'dark:prose-strong:text-neutral-200',
          'dark:prose-em:text-neutral-200',
          'dark:prose-blockquote:text-neutral-300',
          'dark:prose-blockquote:border-neutral-700',
          'dark:prose-ul:text-neutral-300',
          'dark:prose-ol:text-neutral-300'
        ),
      },
    },
    immediatelyRender: false,
  })

  // 内容变化时更新编辑器（false = 不触发 onUpdate，避免 programmatic 写回覆盖其他字段）
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        EDITOR_COMPOSITE_CONTROL_CLASS,
        'relative'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 工具栏 */}
      <div
        className={cn(
          'border-b border-black fresh:border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-2',
          'bg-[#ECEDE9] fresh:bg-slate-50 dark:bg-neutral-900/50 dark:border-white'
        )}
      >
        {/* 文字样式 */}
        <div className="flex items-center gap-0.5">
          <MenuButton
            onClick={() => {
              logBoldDebugSnapshot(editor, 'before')
              editor.chain().focus().toggleBold().run()
              requestAnimationFrame(() => {
                logBoldDebugSnapshot(editor, 'after')
              })
            }}
            isActive={editor.isActive('bold')}
            tooltip="加粗"
          >
            <Bold className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="斜体"
          >
            <Italic className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="下划线"
          >
            <UnderlineIcon className="h-5 w-5" />
          </MenuButton>
        </div>

        <div className={cn('h-5 w-px', 'bg-gray-200 dark:bg-neutral-800')} />

        {/* 对齐方式 */}
        <div className="flex items-center gap-0.5">
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            tooltip="左对齐"
          >
            <AlignLeft className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            tooltip="居中"
          >
            <AlignCenter className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            tooltip="右对齐"
          >
            <AlignRight className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            tooltip="两端对齐"
          >
            <AlignJustify className="h-5 w-5" />
          </MenuButton>
        </div>

        <div className={cn('h-5 w-px', 'bg-gray-200 dark:bg-neutral-800')} />

        {/* 列表 */}
        <div className="flex items-center gap-0.5">
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            tooltip="无序列表"
          >
            <List className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            tooltip="有序列表"
          >
            <ListOrdered className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => {
              // 优先确保选区在列表中，不在则先切换为无序列表再缩进
              const isBullet = editor.isActive('bulletList')
              const isOrdered = editor.isActive('orderedList')
              if (!isBullet && !isOrdered) {
                const didToggle = editor.chain().focus().toggleBulletList().run()
                logDebug('indent-toggle-bullet', { didToggle })
                return
              }

              const nestingLevel = getListItemNestingLevel(editor)
              if (nestingLevel >= 2) {
                logDebug('indent-max-depth-reached', { nestingLevel })
                return
              }

              const canSink = editor.can().sinkListItem('listItem')
              logDebug('indent-increase-click', {
                canSink,
                isBullet: editor.isActive('bulletList'),
                isOrdered: editor.isActive('orderedList'),
              })

              if (canSink) {
                // 正常情况：可以直接 sink
                const didSink = editor.chain().focus().sinkListItem('listItem').run()
                logDebug('indent-increase-result', { didSink })
              } else {
                // 首行情况：无法 sink，需要在前面插入一个空白父级列表项
                logDebug('indent-first-item-detected', { canSink: false })
                
                editor.chain()
                  .focus()
                  .command(({ tr, state }) => {
                    const { $from } = state.selection
                    const listItemType = state.schema.nodes.listItem
                    const paragraphType = state.schema.nodes.paragraph
                    
                    // 找到最近的 listItem
                    let depth = $from.depth
                    while (depth > 0) {
                      const node = $from.node(depth)
                      if (node.type === listItemType) {
                        const pos = $from.before(depth)
                        
                        // 创建一个新的空白 listItem（包含一个空段落）
                        const newListItem = listItemType.create(null, paragraphType.create())
                        tr.insert(pos, newListItem)
                        
                        logDebug('indent-insert-parent', { pos, depth })
                        return true
                      }
                      depth--
                    }
                    logDebug('indent-no-listitem-found', { depth: $from.depth })
                    return false
                  })
                  .run()
                
                // 插入后，再次尝试 sink
                setTimeout(() => {
                  if (getListItemNestingLevel(editor) >= 2) {
                    logDebug('indent-max-depth-reached-post-insert')
                    return
                  }
                  const canSinkNow = editor.can().sinkListItem('listItem')
                  logDebug('indent-after-insert', { canSinkNow })
                  if (canSinkNow) {
                    editor.chain().focus().sinkListItem('listItem').run()
                    logDebug('indent-sink-after-insert', { success: true })
                  }
                }, 10)
              }
            }}
            tooltip="增加缩进 (Tab)"
          >
            <IndentIncrease className="h-5 w-5" />
          </MenuButton>
          <MenuButton
            onClick={() => {
              const canLift = editor.can().liftListItem('listItem')
              logDebug('indent-decrease-click', {
                canLift,
                isBullet: editor.isActive('bulletList'),
                isOrdered: editor.isActive('orderedList'),
              })
              const didLift = editor.chain().focus().liftListItem('listItem').run()
              logDebug('indent-decrease-result', { didLift })
            }}
            tooltip="减少缩进 (Shift+Tab)"
          >
            <IndentDecrease className="h-5 w-5" />
          </MenuButton>
        </div>

        <div className={cn('h-5 w-px', 'bg-gray-200 dark:bg-neutral-800')} />

        {/* 撤销/重做 */}
        <div className="flex items-center gap-0.5">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="撤销"
          >
            <Undo className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="重做"
          >
            <Redo className="h-4 w-4" />
          </MenuButton>

          {/* AI 帮写按钮 - 仅在教育经历模块显示 */}
          {educationData && (
            <button
              onClick={() => setShowAIWriteDialog(true)}
              className="ml-2 flex items-center gap-1 rounded-none fresh:rounded-md border border-black fresh:border-violet-300 bg-violet-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-violet-700 dark:border-white"
            >
              <Wand2 className="h-4 w-4" />
              AI 帮写
            </button>
          )}

          {/* AI 润色按钮 */}
          {(resumeData || onPolish) && (
            <button
              onClick={handlePolish}
              className="ml-2 flex items-center gap-1 rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white px-3 py-1.5 text-sm text-black transition-colors hover:bg-slate-100 dark:border-white dark:bg-neutral-800 dark:text-neutral-100"
            >
              <Wand2 className="h-4 w-4" />
              AI 润色
            </button>
          )}

          {/* 语法 / 表达体检按钮 */}
          {resumeData && (
            <button
              onClick={() => (isContentEmpty() ? toast('先填写一些内容，再做语法体检～') : setShowGrammarDialog(true))}
              className="ml-2 flex items-center gap-1 rounded-none fresh:rounded-md border border-black fresh:border-slate-300 bg-white px-3 py-1.5 text-sm text-black transition-colors hover:bg-slate-100 dark:border-white dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            >
              <SpellCheck className="h-4 w-4" />
              语法体检
            </button>
          )}
        </div>
      </div>

      {/* 编辑区域 */}
      <EditorContent editor={editor} />

      {/* AI 润色对话框 */}
      {resumeData && (
        <PolishChatDialog
          open={showPolishDialog}
          onOpenChange={setShowPolishDialog}
          content={content || ''}
          onApply={handleApplyPolish}
          resumeData={resumeData}
          path={polishPath}
        />
      )}

      {/* 语法 / 表达体检对话框 */}
      {resumeData && (
        <GrammarCheckDialog
          open={showGrammarDialog}
          onOpenChange={setShowGrammarDialog}
          content={content || ''}
          onApply={handleApplyPolish}
          path={polishPath}
        />
      )}

      {/* AI 帮写对话框 */}
      {educationData && (
        <AIWriteDialog
          open={showAIWriteDialog}
          onOpenChange={setShowAIWriteDialog}
          educationData={educationData}
          onApply={(content) => {
            console.log('[RichEditor] AI 帮写采纳内容:', content?.substring(0, 100) + '...')
            // 直接更新编辑器内容
            if (editor) {
              editor.commands.setContent(content)
            }
            // 同时调用 onChange 更新外部状态
            onChange(content)
          }}
        />
      )}
    </div>
  )
}

export default RichEditor
