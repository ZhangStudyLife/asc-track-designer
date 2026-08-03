import type { TrackPiece } from '../../pvc/domain/types'
import type { PvcTrackBounds, PvcTrackDocument } from './types'

export const MAX_WORKSHOP_PIECES = 200
export const MAX_TRACK_DOCUMENT_BYTES = 2 * 1024 * 1024

type ValidationResult =
  | { valid: true; document: PvcTrackDocument }
  | { valid: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseBounds(value: unknown): PvcTrackBounds | null {
  if (!isRecord(value)) return null
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null
  if (!isFiniteNumber(value.width) || value.width <= 0) return null
  if (!isFiniteNumber(value.height) || value.height <= 0) return null
  return { x: value.x, y: value.y, width: value.width, height: value.height }
}

function parsePiece(value: unknown): TrackPiece | null {
  if (!isRecord(value)) return null
  if (!isFiniteNumber(value.id) || !Number.isInteger(value.id)) return null
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) return null
  if (value.rotation !== undefined && !isFiniteNumber(value.rotation)) return null
  if (!isRecord(value.params)) return null

  if (value.type === 'straight') {
    if (!isFiniteNumber(value.params.length) || value.params.length <= 0) return null
    return {
      id: value.id,
      type: 'straight',
      x: value.x,
      y: value.y,
      rotation: value.rotation as number | undefined,
      params: { length: value.params.length },
    }
  }

  if (value.type === 'curve') {
    if (!isFiniteNumber(value.params.radius) || value.params.radius <= 0) return null
    if (!isFiniteNumber(value.params.angle) || value.params.angle <= 0 || value.params.angle > 360) return null
    return {
      id: value.id,
      type: 'curve',
      x: value.x,
      y: value.y,
      rotation: value.rotation as number | undefined,
      params: { radius: value.params.radius, angle: value.params.angle },
    }
  }

  return null
}

export function validatePvcTrackDocument(value: unknown): ValidationResult {
  if (!isRecord(value)) return { valid: false, error: '赛道文件必须是 JSON 对象' }
  if (value.version !== '1.0') return { valid: false, error: '仅支持 PVC 赛道格式 1.0' }
  if (typeof value.created !== 'string' || !Number.isFinite(Date.parse(value.created))) {
    return { valid: false, error: '赛道创建时间无效' }
  }

  const bounds = parseBounds(value.bounds)
  if (!bounds) return { valid: false, error: '赛道边界无效' }
  if (!Array.isArray(value.pieces) || value.pieces.length === 0) {
    return { valid: false, error: '赛道至少需要一个元件' }
  }
  if (value.pieces.length > MAX_WORKSHOP_PIECES) {
    return { valid: false, error: `公开赛道最多包含 ${MAX_WORKSHOP_PIECES} 个元件` }
  }

  const pieces: TrackPiece[] = []
  const ids = new Set<number>()
  for (const source of value.pieces) {
    const piece = parsePiece(source)
    if (!piece) return { valid: false, error: '赛道包含无效元件' }
    if (ids.has(piece.id)) return { valid: false, error: '赛道元件 ID 不能重复' }
    ids.add(piece.id)
    pieces.push(piece)
  }

  return {
    valid: true,
    document: { version: '1.0', created: value.created, bounds, pieces },
  }
}

export function parsePvcTrackDocument(text: string): ValidationResult {
  if (new TextEncoder().encode(text).byteLength > MAX_TRACK_DOCUMENT_BYTES) {
    return { valid: false, error: '赛道 JSON 不能超过 2 MB' }
  }

  try {
    return validatePvcTrackDocument(JSON.parse(text))
  } catch {
    return { valid: false, error: '赛道 JSON 无法解析' }
  }
}
