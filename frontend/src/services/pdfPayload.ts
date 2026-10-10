/**
 * PDF SSE 事件的载荷解码。
 *
 * 载荷编码由前后端按请求头协商，两种事件都必须支持：
 *   - `pdf`      → hex。历史编码，体积是原始字节的 2 倍。老后端、以及
 *                  admin 远程流（后端自行 hex 编码，不认协商头）仍走这条。
 *   - `pdf_b64`  → base64。新后端在收到 X-PDF-Payload-Encoding: base64 时返回，
 *                  体积只有 4/3，且解出来不需要为每个字节分配一个字符串。
 *
 * 之所以保留 hex 分支而不是直接切换：前端产物可能被浏览器缓存，后端也可能
 * 尚未升级。任一侧是旧的都不能让用户拿到损坏的 PDF。
 */

export const PDF_PAYLOAD_ENCODING_HEADER = 'X-PDF-Payload-Encoding'
export const PDF_PAYLOAD_BASE64 = 'base64'
export const PDF_EVENT_HEX = 'pdf'
export const PDF_EVENT_BASE64 = 'pdf_b64'

export type PdfEventType = typeof PDF_EVENT_HEX | typeof PDF_EVENT_BASE64

/** 是否为携带 PDF 载荷的事件（hex 或 base64）。 */
export function isPdfPayloadEvent(eventType: string | null | undefined): eventType is PdfEventType {
  return eventType === PDF_EVENT_HEX || eventType === PDF_EVENT_BASE64
}

/**
 * hex → 字节。保持历史实现不变（含 `match` + `map` 的写法与报错文案），
 * 以免影响仍在走这条路径的旧后端 / admin 远程流。
 */
function decodeHexPayload(normalizedHex: string): Uint8Array {
  const matches = normalizedHex.match(/.{2}/g)
  if (!matches) {
    throw new Error('PDF数据格式错误')
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
}

/**
 * base64 → 字节。atob 得到二进制字符串后逐字节取码，只为结果的 Uint8Array
 * 分配一次内存，不像 hex 分支那样为每个字节产生一个中间字符串。
 */
function decodeBase64Payload(payload: string): Uint8Array {
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i) & 0xff
  }
  if (bytes.length === 0) {
    throw new Error('PDF数据格式错误')
  }
  return bytes
}

/**
 * 按事件类型解码 PDF 载荷。
 *
 * 报错文案与历史实现保持一致：空载荷抛「PDF数据为空」，其余失败统一包成
 * 「PDF数据转换失败: ...」，便于沿用既有的排查路径。
 */
export function decodePdfPayload(eventType: PdfEventType, payload: string): Uint8Array {
  if (!payload || payload.length === 0) {
    throw new Error('PDF数据为空')
  }
  try {
    if (eventType === PDF_EVENT_BASE64) {
      return decodeBase64Payload(payload)
    }
    // 保持历史行为：hex 长度为奇数时左补一个 0
    const normalizedHex = payload.length % 2 === 0 ? payload : `0${payload}`
    return decodeHexPayload(normalizedHex)
  } catch (error) {
    throw new Error(
      `PDF数据转换失败: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}