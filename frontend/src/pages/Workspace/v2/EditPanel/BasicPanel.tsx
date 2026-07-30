import { toast } from '@/lib/toast'
/**
 * 基本信息编辑面板
 */
import { useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Upload, Loader2, X } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { uploadUserPhoto, listUserPhotos, type UserPhoto } from '@/services/photoService'
import { InlineDatePicker } from '@/components/InlineDatePicker'
import type { BasicInfo, GlobalSettings, FieldLabelMode } from '../types'
import Field from './Field'
import FieldStyleToggle from './FieldStyleToggle'
import { getAgeFromBirthDate } from '../utils/birthDateDisplay'
import { resolveFieldMode, fieldTextLabel } from '../utils/fieldDisplayStyle'
import PortalDropdown from '@/components/common/PortalDropdown'

/** 工作年限下拉选项：value 即简历上的展示文本；空 value = 不展示该字段 */
const WORK_YEARS_OPTIONS = [
  { value: '', label: '不展示' },
  { value: '应届生', label: '应届生' },
  ...Array.from({ length: 9 }, (_, i) => ({
    value: `${i + 1}年经验`,
    label: `${i + 1}年经验`,
  })),
  { value: '10年以上经验', label: '10年以上经验' },
]

interface BasicPanelProps {
  basic: BasicInfo
  onUpdate: (data: Partial<BasicInfo>) => void
  globalSettings?: GlobalSettings
  updateGlobalSettings?: (settings: Partial<GlobalSettings>) => void
}

/** 照片位置/大小滑块：人话标签 + 实时数值 + 方向提示（与排版抽屉的滑块同款视觉） */
function PhotoSlider({
  label,
  hint,
  min,
  max,
  value,
  format,
  onChange,
}: {
  label: string
  hint?: string
  min: number
  max: number
  value: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10px] font-medium text-slate-500 uppercase fresh:normal-case tracking-wide fresh:tracking-normalr fresh:tracking-normal">{label}</label>
        <span className="font-mono fresh:font-sans text-[11px] text-slate-500 tabular-nums shrink-0">{format(value)}</span>
      </div>
      {hint && <p className="text-[10px] text-slate-400 leading-snug">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-[#E5E5E0] fresh:bg-slate-100 dark:bg-slate-700 rounded-none fresh:rounded-md appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:bg-[#4285F4]
                   [&::-webkit-slider-thumb]:border-none
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:w-3
                   [&::-moz-range-thumb]:h-3
                   [&::-moz-range-thumb]:bg-[#4285F4]
                   [&::-moz-range-thumb]:border-none
                   [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  )
}

const BasicPanel = ({ basic, onUpdate, globalSettings, updateGlobalSettings }: BasicPanelProps) => {
  const { isAuthenticated, token, openModal } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 历史照片复用：从 COS 已上传照片里挑一张，避免重复上传
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<UserPhoto[]>([])

  const applyPhoto = (url: string) => {
    onUpdate({
      photo: url,
      photoOffsetX: basic?.photoOffsetX ?? 0,
      photoOffsetY: basic?.photoOffsetY ?? -2,
      photoWidthCm: basic?.photoWidthCm ?? 3,
      photoHeightCm: basic?.photoHeightCm ?? 3,
    })
  }

  const handleToggleGallery = async () => {
    if (!isAuthenticated || !token) {
      openModal('login')
      return
    }
    const next = !galleryOpen
    setGalleryOpen(next)
    if (next) {
      setGalleryLoading(true)
      try {
        setGalleryPhotos(await listUserPhotos(token))
      } catch (err: any) {
        toast.error(err?.message || '读取照片列表失败')
        setGalleryOpen(false)
      } finally {
        setGalleryLoading(false)
      }
    }
  }

  const handleSelectPhoto = () => {
    if (!isAuthenticated) {
      openModal('login')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!token) {
      toast.error('请先登录后再上传照片')
      return
    }

    // 前端预校验：与后端 2MB / 图片类型限制一致，避免上传后才失败
    if (!file.type.startsWith('image/')) {
      toast.error('仅支持图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片过大，最大支持 2MB')
      return
    }

    setUploading(true)
    try {
      const result = await uploadUserPhoto(file, token)
      applyPhoto(result.url)
      // 若"已上传照片"面板开着，把新照片插到最前，避免列表停留在上传前的旧状态
      setGalleryPhotos((prev) =>
        prev.some((p) => p.url === result.url) ? prev : [{ url: result.url, key: result.key }, ...prev]
      )
    } catch (err: any) {
      toast.error(err?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const hasPhoto = Boolean(basic?.photo)
  const photoOffsetX = basic?.photoOffsetX ?? 0
  const photoOffsetY = basic?.photoOffsetY ?? -2
  const normalizeDecimal = (value: number, digits = 2) => Number(value.toFixed(digits))
  // 以当前正确渲染位置作为 UI 的 0 点（内部绝对值 +2）
  const photoOffsetYDisplay = normalizeDecimal(photoOffsetY + 2, 2)
  const photoWidthCm = basic?.photoWidthCm ?? 3
  const photoHeightCm = basic?.photoHeightCm ?? 3
  const birthDateDisplayMode = globalSettings?.birthDateDisplayMode || 'birthDate'
  const birthDateLabel = basic?.birthDate?.trim() || '2003-05'
  const ageLabel = (() => {
    const age = getAgeFromBirthDate(basic?.birthDate || '')
    return age !== null ? `${age} 岁` : '23 岁'
  })()

  // 每字段「显示样式」切换：mode 落 globalSettings.fieldLabelModes（标签 + 值 / 仅值）
  const setFieldMode = (key: string, mode: FieldLabelMode) =>
    updateGlobalSettings?.({
      fieldLabelModes: { ...globalSettings?.fieldLabelModes, [key]: mode },
    })
  const styleToggle = (key: string) => (
    <FieldStyleToggle
      mode={resolveFieldMode(key, globalSettings)}
      onModeChange={(mode) => setFieldMode(key, mode)}
      allowIcon={key === 'blog'}
      // 提示里给本字段的真实示例（邮箱：xxx / 工作年限：xxx），与渲染前缀同源
      fieldLabel={fieldTextLabel(key, birthDateDisplayMode)}
    />
  )

  return (
    <div className="space-y-6 p-6">
      {/* 资料 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="space-y-4"
      >
        <h3 className="font-medium text-neutral-900 dark:text-neutral-200">
          基础字段
        </h3>

        <div className="flex flex-col xl:flex-row items-start gap-6">
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                index={0}
                label="姓名"
                value={basic?.name || ''}
                onChange={(value) => onUpdate({ name: value })}
                placeholder="请输入姓名"
              />
              <Field
                index={1}
                label="职位"
                value={basic?.title || ''}
                onChange={(value) => onUpdate({ title: value })}
                placeholder="请输入目标职位"
                labelExtra={styleToggle('title')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 3 * 0.04, ease: 'easeOut' }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm text-gray-600 dark:text-neutral-300">年龄</label>
                  {styleToggle('birthDate')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <InlineDatePicker
                      value={basic?.birthDate || null}
                      placeholder="选择年月"
                      onSelect={(value) => onUpdate({ birthDate: value ?? '' })}
                    />
                  </div>
                  <select
                    value={birthDateDisplayMode}
                    onChange={(e) => updateGlobalSettings?.({ birthDateDisplayMode: e.target.value as 'birthDate' | 'age' })}
                    className={cn(
                      'h-11 rounded-none fresh:rounded-md border-2 fresh:border px-3 text-sm font-semibold',
                      'bg-white dark:bg-[#1C1C1C]',
                      'border-black fresh:border-slate-200 dark:border-white',
                      'text-slate-700 dark:text-slate-200',
                      'focus:outline-none focus:ring-2 focus:ring-blue-700 fresh:focus:ring-blue-200 focus:border-black fresh:focus:border-blue-400'
                    )}
                    title="选择渲染方式"
                  >
                    <option value="birthDate">显示 {birthDateLabel}</option>
                    <option value="age">显示 {ageLabel}</option>
                  </select>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 3.5 * 0.04, ease: 'easeOut' }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm text-gray-600 dark:text-neutral-300">工作年限</label>
                  {styleToggle('workYears')}
                </div>
                <PortalDropdown
                  value={basic?.workYears || ''}
                  options={WORK_YEARS_OPTIONS}
                  placeholder="选择工作年限"
                  onSelect={(v) => onUpdate({ workYears: v ?? '' })}
                  triggerClassName="h-11 w-full px-3"
                  dropdownClassName="min-w-[12rem]"
                />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
                index={4}
                label="邮箱"
                value={basic?.email || ''}
                onChange={(value) => onUpdate({ email: value })}
                placeholder="请输入邮箱"
                labelExtra={styleToggle('email')}
              />
              <Field
                index={5}
                label="电话"
                value={basic?.phone || ''}
                onChange={(value) => onUpdate({ phone: value })}
                placeholder="请输入电话"
                labelExtra={styleToggle('phone')}
              />
            </div>

            <Field
              index={6}
              label="地址"
              value={basic?.location || ''}
              onChange={(value) => onUpdate({ location: value })}
              placeholder="请输入所在城市"
              labelExtra={styleToggle('location')}
            />

            <Field
              index={7}
              label="博客/GitHub"
              value={basic?.blog || ''}
              onChange={(value) => onUpdate({ blog: value })}
              placeholder="如：https://github.com/you 或 https://blog.example.com"
              labelExtra={styleToggle('blog')}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 7 * 0.04, ease: 'easeOut' }}
            className="w-full xl:w-[180px] shrink-0"
          >
            <div className="rounded-none fresh:rounded-md border-2 fresh:border border-black fresh:border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm dark:shadow-[2px_2px_0px_0px_#ffffff]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-800">
                  照片设置
                </div>
                {hasPhoto && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ photo: '' })}
                    className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                    title="移除照片"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleSelectPhoto}
                disabled={uploading}
                className={cn(
                  'w-full h-48 rounded-none fresh:rounded-md border-2 fresh:border border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                  isAuthenticated
                    ? 'border-black fresh:border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50/60'
                    : 'border-black fresh:border-slate-200 text-slate-300',
                  uploading && 'opacity-60'
                )}
                title={isAuthenticated ? '上传照片' : '登录后可上传'}
              >
                {hasPhoto ? (
                  <img
                    src={basic.photo}
                    alt="照片"
                    className="w-full h-full object-contain rounded-none fresh:rounded-md bg-white"
                  />
                ) : (
                  <>
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                    <span className="text-xs font-medium">上传照片</span>
                  </>
                )}
              </button>

              {/* 从已上传照片里复用（避免重复上传） */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleToggleGallery}
                  className="mt-2 w-full py-1.5 rounded-none fresh:rounded-md border border-black fresh:border-slate-200 bg-white text-xs font-mono fresh:font-sans font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {galleryOpen ? '收起已上传照片' : '从已上传照片中选择'}
                </button>
              )}

              {galleryOpen && (
                <div className="mt-2 rounded-none fresh:rounded-md border-2 fresh:border border-black fresh:border-slate-200 p-2">
                  {galleryLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
                    </div>
                  ) : galleryPhotos.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">还没有上传过照片</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {galleryPhotos.map((p) => {
                        const active = basic?.photo === p.url
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              applyPhoto(p.url)
                              setGalleryOpen(false)
                            }}
                            className={cn(
                              'aspect-square rounded-none fresh:rounded-md border-2 fresh:border overflow-hidden bg-white transition-all',
                              active
                                ? 'border-blue-700 shadow-[2px_2px_0px_0px_#1d4ed8] fresh:shadow-sm'
                                : 'border-black fresh:border-slate-200 hover:shadow-[2px_2px_0px_0px_#000000]'
                            )}
                            title="使用这张照片"
                          >
                            <img src={p.url} alt="已上传照片" className="w-full h-full object-cover" />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {hasPhoto && (
                <div className="mt-4 space-y-4">
                  <PhotoSlider
                    label="左右位置"
                    hint="往右拖、照片向右移"
                    min={-6}
                    max={6}
                    value={photoOffsetX}
                    format={(v) => `${v > 0 ? '+' : ''}${v} cm`}
                    onChange={(v) => onUpdate({ photoOffsetX: v })}
                  />
                  <PhotoSlider
                    label="上下位置"
                    hint="往右拖、照片向上移"
                    min={-4}
                    max={8}
                    value={photoOffsetYDisplay}
                    format={(v) => `${v > 0 ? '+' : ''}${v} cm`}
                    onChange={(v) => onUpdate({ photoOffsetY: normalizeDecimal(v - 2, 2) })}
                  />
                  <PhotoSlider
                    label="照片宽度"
                    min={1.2}
                    max={5}
                    value={photoWidthCm}
                    format={(v) => `${v} cm`}
                    onChange={(v) => onUpdate({ photoWidthCm: v })}
                  />
                  <PhotoSlider
                    label="照片高度"
                    min={1.2}
                    max={6}
                    value={photoHeightCm}
                    format={(v) => `${v} cm`}
                    onChange={(v) => onUpdate({ photoHeightCm: v })}
                  />
                  <p className="text-[10px] text-slate-400">
                    位置和大小调整仅对 Classic LaTeX 模板生效、调整后预览会自动刷新
                  </p>
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-3 text-xs text-slate-400">
                  登录后可上传
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default BasicPanel
