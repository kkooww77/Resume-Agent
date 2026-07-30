/**
 * CV 工具层
 * 提供 CVReader 和 CVEditor 两个核心工具
 */

import type { ResumeData } from '../pages/Workspace/v2/types'

// ==================== 类型定义 ====================

/**
 * 工具执行结果
 */
export interface ToolResult {
  status: 'success' | 'error'
  message: string
  data?: any
  path?: string
}

/**
 * CVEditor 操作类型
 */
export type EditorAction = 'update' | 'add' | 'delete'

/**
 * CVEditor 参数
 */
export interface CVEditorParams {
  path: string
  action: EditorAction
  value?: any
}

/**
 * CVReader 参数
 */
export interface CVReaderParams {
  path?: string  // 可选，不传则返回完整简历数据
}

// ==================== 路径解析工具 ====================

/**
 * 解析路径字符串为路径数组
 * 支持格式：education[0].school、projects[1].description
 * @param path 路径字符串
 * @returns 路径片段数组
 */
export function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = []
  let buf = ''
  let i = 0
  
  while (i < path.length) {
    const ch = path[i]
    
    if (ch === '.') {
      if (buf) {
        parts.push(buf)
        buf = ''
      }
      i++
      continue
    }
    
    if (ch === '[') {
      if (buf) {
        parts.push(buf)
        buf = ''
      }
      const j = path.indexOf(']', i)
      if (j === -1) {
        throw new Error('路径解析失败：缺少闭合 ]')
      }
      const idxStr = path.slice(i + 1, j).trim()
      if (!/^\d+$/.test(idxStr)) {
        throw new Error('索引需为数字')
      }
      parts.push(parseInt(idxStr, 10))
      i = j + 1
      continue
    }
    
    buf += ch
    i++
  }
  
  if (buf) {
    parts.push(buf)
  }
  
  return parts
}

/**
 * 根据路径获取值
 * @param obj 对象
 * @param parts 路径数组
 * @returns [父对象, 键/索引, 当前值]
 */
export function getByPath(obj: any, parts: (string | number)[]): [any, string | number, any] {
  let current = obj
  let parent = null
  let key: string | number = ''
  
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    parent = current
    key = p
    
    if (current === undefined || current === null) {
      throw new Error(`路径不存在：${parts.slice(0, i + 1).join('.')}`)
    }
    
    if (typeof p === 'number') {
      if (!Array.isArray(current)) {
        throw new Error(`路径错误：${parts.slice(0, i).join('.')} 不是数组`)
      }
      if (p < 0 || p >= current.length) {
        throw new Error(`索引越界：${p}，数组长度为 ${current.length}`)
      }
    }
    
    current = current[p]
  }
  
  return [parent, key, current]
}

/**
 * 根据路径设置值
 * @param obj 对象
 * @param parts 路径数组
 * @param value 新值
 */
export function setByPath(obj: any, parts: (string | number)[], value: any): void {
  const [parent, key] = getByPath(obj, parts.slice(0, -1).length > 0 ? parts : [])
  
  if (parts.length === 1) {
    obj[parts[0]] = value
  } else {
    const lastKey = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1)
    const [parentObj] = getByPath(obj, parentPath)
    parentObj[lastKey] = value
  }
}

// ==================== CVReader 工具 ====================

/**
 * CVReader - 读取简历数据
 * 
 * @param resumeData 简历数据
 * @param params 参数（可选路径）
 * @returns 工具执行结果
 * 
 * @example
 * // 读取完整简历
 * cvReader(resumeData)
 * 
 * // 读取教育经历
 * cvReader(resumeData, { path: 'education' })
 * 
 * // 读取第一条教育经历
 * cvReader(resumeData, { path: 'education[0]' })
 */
export function cvReader(resumeData: ResumeData, params?: CVReaderParams): ToolResult {
  try {
    // 如果没有指定路径，返回完整简历数据
    if (!params?.path) {
      return {
        status: 'success',
        message: '读取完整简历数据成功',
        data: resumeData
      }
    }
    
    // 解析路径并获取数据
    const parts = parsePath(params.path)
    const [, , value] = getByPath(resumeData, parts)
    
    return {
      status: 'success',
      message: `读取成功：${params.path}`,
      data: value,
      path: params.path
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '读取失败',
      path: params?.path
    }
  }
}

// ==================== CVEditor 工具 ====================

/**
 * CVEditor - 编辑简历数据
 * 
 * @param resumeData 简历数据（会被直接修改）
 * @param params 编辑参数
 * @returns 工具执行结果
 * 
 * @example
 * // 更新字段
 * cvEditor(resumeData, {
 *   path: 'education[0].school',
 *   action: 'update',
 *   value: '清华大学'
 * })
 * 
 * // 添加新项
 * cvEditor(resumeData, {
 *   path: 'education',
 *   action: 'add',
 *   value: { id: '...', school: '北京大学', ... }
 * })
 * 
 * // 删除项
 * cvEditor(resumeData, {
 *   path: 'education[1]',
 *   action: 'delete'
 * })
 */
export function cvEditor(resumeData: ResumeData, params: CVEditorParams): ToolResult {
  const { path, action, value } = params
  
  try {
    const parts = parsePath(path)
    
    switch (action) {
      case 'update': {
        if (value === undefined) {
          return {
            status: 'error',
            message: 'update 操作需要提供 value 参数',
            path
          }
        }
        
        // 获取父对象和键，然后设置值
        if (parts.length === 1) {
          // 顶层属性
          (resumeData as any)[parts[0]] = value
        } else {
          // 嵌套属性：需要获取父对象，然后设置最后一个键的值
          let current: any = resumeData
          for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]]
          }
          current[parts[parts.length - 1]] = value
        }
        
        return {
          status: 'success',
          message: `已更新简历字段：${path}`,
          path
        }
      }
      
      case 'add': {
        if (value === undefined) {
          return {
            status: 'error',
            message: 'add 操作需要提供 value 参数',
            path
          }
        }
        
        // 获取目标数组，若不存在或不是数组则创建
        let targetArray: any[]
        try {
          const [, , existing] = getByPath(resumeData, parts)
          if (!Array.isArray(existing)) {
            // 不是数组，替换为空数组
            if (parts.length === 1) {
              (resumeData as any)[parts[0]] = []
              targetArray = (resumeData as any)[parts[0]]
            } else {
              let current: any = resumeData
              for (let i = 0; i < parts.length - 1; i++) {
                current = current[parts[i]]
              }
              current[parts[parts.length - 1]] = []
              targetArray = current[parts[parts.length - 1]]
            }
          } else {
            targetArray = existing
          }
        } catch {
          // 路径不存在，创建空数组
          if (parts.length === 1) {
            (resumeData as any)[parts[0]] = []
            targetArray = (resumeData as any)[parts[0]]
          } else {
            let current: any = resumeData
            for (let i = 0; i < parts.length - 1; i++) {
              if (current[parts[i]] === undefined) {
                current[parts[i]] = {}
              }
              current = current[parts[i]]
            }
            current[parts[parts.length - 1]] = []
            targetArray = current[parts[parts.length - 1]]
          }
        }
        
        // 添加新项
        targetArray.push(value)
        
        return {
          status: 'success',
          message: `已添加简历字段：${path}`,
          path
        }
      }
      
      case 'delete': {
        if (parts.length === 1) {
          // 顶层属性：清空而不是删除
          const key = parts[0] as string
          const currentValue = (resumeData as any)[key]
          
          if (Array.isArray(currentValue)) {
            // 数组清空为 []
            (resumeData as any)[key] = []
          } else if (typeof currentValue === 'string') {
            // 字符串清空为 ''
            (resumeData as any)[key] = ''
          } else if (typeof currentValue === 'object' && currentValue !== null) {
            // 对象清空为 {}
            (resumeData as any)[key] = {}
          } else {
            // 其他类型设为 null
            (resumeData as any)[key] = null
          }
          
          return {
            status: 'success',
            message: `已清空简历字段：${path}`,
            path
          }
        }
        
        // 获取父对象
        let parent: any = resumeData
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]
          if (parent === undefined || parent === null) {
            return {
              status: 'error',
              message: `路径不存在：${parts.slice(0, i + 1).join('.')}`,
              path
            }
          }
          parent = parent[part]
        }
        const lastKey = parts[parts.length - 1]
        
        if (parent === undefined || parent === null) {
          return {
            status: 'error',
            message: `父对象不存在：${parts.slice(0, -1).join('.')}`,
            path
          }
        }
        
        if (typeof lastKey === 'number' && Array.isArray(parent)) {
          // 从数组中删除
          if (lastKey < 0 || lastKey >= parent.length) {
            return {
              status: 'error',
              message: `索引越界：${lastKey}，数组长度为 ${parent.length}`,
              path
            }
          }
          parent.splice(lastKey, 1)
        } else if (typeof lastKey === 'string' && typeof parent === 'object') {
          // 删除对象属性
          delete parent[lastKey]
        } else {
          return {
            status: 'error',
            message: `无法删除：父对象类型不匹配`,
            path
          }
        }
        
        return {
          status: 'success',
          message: `已删除简历字段：${path}`,
          path
        }
      }
      
      default:
        return {
          status: 'error',
          message: `不支持的操作类型：${action}`,
          path
        }
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '操作失败',
      path
    }
  }
}

// ==================== 工具调用包装器 ====================

/**
 * 工具调用 JSON 格式
 */
export interface ToolCall {
  name: 'CVReader' | 'CVEditor' | 'CVBatchEditor'
  params: CVReaderParams | CVEditorParams | CVBatchEditorParams
}

/**
 * CVBatchEditor 参数
 */
export interface CVBatchEditorParams {
  operations: Array<{
    path: string
    action: 'update' | 'add' | 'delete'
    value?: any
  }>
}

/**
 * 路径映射：后端字段名 -> 前端字段名
 * 统一后端和前端数据模型之间的字段名差异
 */
const PATH_MAPPING: Record<string, string> = {
  'workExperience': 'workExperience',  // 工作经历
  'experience': 'experience',          // 实习经历
  'projectExperience': 'projects',     // 项目经历
  'skills': 'skillContent',            // 专业技能
  'certificates': 'awards',            // 证书荣誉
}

/**
 * 转换路径：将后端字段名映射到前端字段名
 */
function mapPath(path: string): string {
  for (const [backendKey, frontendKey] of Object.entries(PATH_MAPPING)) {
    // 替换路径开头的字段名
    if (path === backendKey) {
      return frontendKey
    }
    if (path.startsWith(backendKey + '.') || path.startsWith(backendKey + '[')) {
      return frontendKey + path.slice(backendKey.length)
    }
  }
  return path
}

/**
 * 转换后端格式到前端格式
 * 后端：{ company, position, startDate, endDate, description }
 * 前端：{ id, company, position, date, details }
 */
function convertBackendToFrontend(value: any, path: string): any {
  // 只转换 workExperience/experience 模块的 add 操作
  if (path === 'experience' || path === 'workExperience') {
    if (value && typeof value === 'object') {
      const converted: any = {
        id: value.id || `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        company: value.company || '',
        position: value.position || '',
        date: '',
        details: '',
        visible: value.visible !== false
      }
      
      // 转换日期：startDate + endDate -> date
      if (value.startDate || value.endDate) {
        const formatDate = (dateStr: string) => {
          if (!dateStr) return ''
          // 将 "2020-01" 转换为 "2020.01"
          // 将 "2020-1" 转换为 "2020.01"
          return dateStr
            .replace(/-(\d)$/, '-0$1')  // 2020-1 -> 2020-01
            .replace(/-/g, '.')          // 2020-01 -> 2020.01
        }
        const start = formatDate(value.startDate || '')
        const end = formatDate(value.endDate || '')
        if (start && end) {
          converted.date = `${start} - ${end}`
        } else if (start) {
          converted.date = start
        } else if (end) {
          converted.date = end
        }
      } else if (value.date) {
        // 如果已经有 date 字段，直接使用
        converted.date = value.date
      }
      
      // 转换描述：description -> details (纯文本转 HTML)
      if (value.description) {
        // 将纯文本转换为 HTML（每行一个段落）
        const lines = value.description.split('\n').filter(line => line.trim())
        if (lines.length > 0) {
          converted.details = lines.map(line => `<p>${line.trim()}</p>`).join('')
        }
      } else if (value.details) {
        // 如果已经有 details 字段，直接使用
        converted.details = value.details
      }
      
      return converted
    }
  }
  
  // 其他情况直接返回原值
  return value
}

/**
 * 执行工具调用
 * @param resumeData 简历数据
 * @param toolCall 工具调用对象
 * @returns 工具执行结果
 */
export function executeToolCall(resumeData: ResumeData, toolCall: ToolCall): ToolResult {
  // 复制参数以避免修改原对象
  const params = { ...toolCall.params }

  switch (toolCall.name) {
    case 'CVReader':
      return cvReader(resumeData, params as CVReaderParams)

    case 'CVEditor':
      // 路径映射（统一后端和前端字段名）
      if ('path' in params && params.path) {
        const originalPath = params.path
        params.path = mapPath(params.path)
        if (originalPath !== params.path) {
          console.log(`[工具调用] 路径映射: ${originalPath} -> ${params.path}`)
        }
      }

      // 数据格式转换（后端格式 -> 前端格式）
      if ('action' in params && params.action === 'add' && 'value' in params && params.value) {
        const convertedValue = convertBackendToFrontend(params.value, params.path || '')
        if (convertedValue !== params.value) {
          console.log(`[工具调用] 数据格式转换:`, {
            original: params.value,
            converted: convertedValue
          })
          params.value = convertedValue
        }
      }

      return cvEditor(resumeData, params as CVEditorParams)

    case 'CVBatchEditor':
      return executeBatchOperations(resumeData, params as CVBatchEditorParams)

    default:
      return {
        status: 'error',
        message: `未知的工具：${(toolCall as any).name}`
      }
  }
}

/**
 * 执行批量编辑操作
 * @param resumeData 简历数据
 * @param params 批量编辑参数
 * @returns 工具执行结果
 */
export function executeBatchOperations(resumeData: ResumeData, params: CVBatchEditorParams): ToolResult {
  const { operations } = params
  const results: ToolResult[] = []
  let succeeded = 0
  let failed = 0

  for (const op of operations) {
    const result = executeToolCall(resumeData, { name: 'CVEditor', params: op })
    results.push(result)
    if (result.status === 'success') {
      succeeded++
    } else {
      failed++
    }
  }

  return {
    status: failed === 0 ? 'success' : 'error',
    message: `批量操作完成：成功 ${succeeded} 个，失败 ${failed} 个`,
    data: {
      total: operations.length,
      succeeded,
      failed,
      results
    }
  }
}

/**
 * 批量执行工具调用
 * @param resumeData 简历数据
 * @param toolCalls 工具调用数组
 * @returns 工具执行结果数组
 */
export function executeToolCalls(resumeData: ResumeData, toolCalls: ToolCall[]): ToolResult[] {
  return toolCalls.map(call => executeToolCall(resumeData, call))
}

