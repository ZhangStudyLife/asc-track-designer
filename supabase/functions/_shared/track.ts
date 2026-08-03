import { HttpError } from './http.ts'

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
export const MAX_PREVIEW_BYTES = 1024 * 1024

const licenses = new Set(['cc-by-4.0', 'cc-by-nc-4.0', 'cc0-1.0', 'all-rights-reserved'])

type StraightPiece = {
  id: number
  type: 'straight'
  x: number
  y: number
  rotation?: number
  params: { length: number }
}

type CurvePiece = Omit<StraightPiece, 'type' | 'params'> & {
  type: 'curve'
  params: { radius: number; angle: number }
}

type TrackPiece = StraightPiece | CurvePiece

export type TrackDocument = {
  version: '1.0'
  created: string
  bounds: { x: number; y: number; width: number; height: number }
  pieces: TrackPiece[]
}

export type PublishMetadata = {
  trackId: string | null
  title: string
  description: string
  tags: string[]
  license: string
  changeNote: string
  appVersion: string
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function text(value: unknown, maximum: number, field: string, required = false) {
  if (typeof value !== 'string') throw new HttpError(400, `${field}格式无效`)
  const normalized = value.trim()
  if (required && !normalized) throw new HttpError(400, `请填写${field}`)
  if (normalized.length > maximum) throw new HttpError(400, `${field}不能超过 ${maximum} 个字符`)
  return normalized
}

export function validatePublishMetadata(value: unknown): PublishMetadata {
  const source = record(value)
  if (!source) throw new HttpError(400, '发布信息格式无效')

  const tags = Array.isArray(source.tags)
    ? [...new Set(source.tags.map((tag) => text(tag, 32, '标签', true)))]
    : []
  if (tags.length > 5) throw new HttpError(400, '最多填写 5 个标签')
  if (typeof source.license !== 'string' || !licenses.has(source.license)) {
    throw new HttpError(400, '请选择有效的作品许可')
  }

  const trackId = source.trackId === null || source.trackId === undefined
    ? null
    : text(source.trackId, 36, '赛道 ID', true)
  if (trackId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trackId)) {
    throw new HttpError(400, '赛道 ID 无效')
  }

  return {
    trackId,
    title: text(source.title, 80, '标题', true),
    description: text(source.description ?? '', 2000, '描述'),
    tags,
    license: source.license,
    changeNote: text(source.changeNote ?? '', 1000, '版本说明'),
    appVersion: text(source.appVersion, 32, '应用版本', true),
  }
}

function validatePiece(value: unknown): TrackPiece {
  const piece = record(value)
  if (!piece || !finite(piece.id) || !Number.isInteger(piece.id)) throw new HttpError(400, '赛道包含无效元件')
  if (!finite(piece.x) || !finite(piece.y)) throw new HttpError(400, '赛道包含无效坐标')
  if (piece.rotation !== undefined && !finite(piece.rotation)) throw new HttpError(400, '赛道包含无效旋转角度')
  const params = record(piece.params)
  if (!params) throw new HttpError(400, '赛道元件参数无效')

  if (piece.type === 'straight' && finite(params.length) && params.length > 0) {
    return {
      id: piece.id,
      type: 'straight',
      x: piece.x,
      y: piece.y,
      rotation: piece.rotation as number | undefined,
      params: { length: params.length },
    }
  }
  if (
    piece.type === 'curve'
    && finite(params.radius)
    && params.radius > 0
    && finite(params.angle)
    && params.angle > 0
    && params.angle <= 360
  ) {
    return {
      id: piece.id,
      type: 'curve',
      x: piece.x,
      y: piece.y,
      rotation: piece.rotation as number | undefined,
      params: { radius: params.radius, angle: params.angle },
    }
  }
  throw new HttpError(400, '赛道包含无效元件')
}

export function validateTrackDocument(value: unknown): TrackDocument {
  const source = record(value)
  if (!source || source.version !== '1.0') throw new HttpError(400, '仅支持 PVC 赛道格式 1.0')
  if (typeof source.created !== 'string' || !Number.isFinite(Date.parse(source.created))) {
    throw new HttpError(400, '赛道创建时间无效')
  }
  const bounds = record(source.bounds)
  if (
    !bounds
    || !finite(bounds.x)
    || !finite(bounds.y)
    || !finite(bounds.width)
    || bounds.width <= 0
    || !finite(bounds.height)
    || bounds.height <= 0
  ) throw new HttpError(400, '赛道边界无效')
  if (!Array.isArray(source.pieces) || source.pieces.length < 1 || source.pieces.length > 200) {
    throw new HttpError(400, '公开赛道必须包含 1-200 个元件')
  }

  const pieces = source.pieces.map(validatePiece)
  if (new Set(pieces.map((piece) => piece.id)).size !== pieces.length) {
    throw new HttpError(400, '赛道元件 ID 不能重复')
  }
  return {
    version: '1.0',
    created: source.created,
    bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    pieces,
  }
}

export function trackTotalLength(document: TrackDocument) {
  const centimeters = document.pieces.reduce((sum, piece) => {
    if (piece.type === 'straight') return sum + piece.params.length
    return sum + piece.params.radius * piece.params.angle * Math.PI / 180
  }, 0)
  return Math.round(centimeters) / 100
}

export async function checksumSha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
