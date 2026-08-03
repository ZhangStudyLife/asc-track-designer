import { getPvcPieces, usePvcEditorStore } from '../../pvc/application/editorStore'
import { TRACK_STORAGE_KEYS, writePiecesHistory } from '../../pvc/application/storage'
import { PVC_DESIGN_BOUNDS } from '../../pvc/domain/constants'
import { TRACK_RENDER_SCALE, TRACK_WIDTH } from '../../pvc/domain/geometry'
import { calculateTrackStats } from '../../pvc/domain/stats'
import type { TrackPiece } from '../../pvc/domain/types'
import { saveTextFile } from '../../../shared/platform/files'
import { validatePvcTrackDocument } from '../domain/trackDocument'
import type { PvcTrackDocument } from '../domain/types'

const PREVIEW_WIDTH = 1200
const PREVIEW_HEIGHT = 675
const PREVIEW_PADDING = 72

type Point = { x: number; y: number }

type StoredProject = {
  name: string
  pieces: TrackPiece[]
  viewBox: { x: number; y: number; width: number; height: number }
  timestamp: string
}

function safeJsonParse(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function isStoredProject(value: unknown): value is StoredProject {
  if (!value || typeof value !== 'object') return false
  const project = value as Partial<StoredProject>
  return typeof project.name === 'string' && Array.isArray(project.pieces)
}

function timestampLabel(date: Date) {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/[/:]/g, '-').replace(/\s+/g, ' ')
}

function createArchiveName(storage: Storage, date: Date) {
  const base = `工坊导入前备份 ${timestampLabel(date)}`
  let name = base
  let suffix = 2
  while (storage.getItem(`${TRACK_STORAGE_KEYS.archivePrefix}${name}`)) {
    name = `${base} (${suffix})`
    suffix += 1
  }
  return name
}

function currentProject(storage: Storage): StoredProject | null {
  const stored = safeJsonParse(storage.getItem(TRACK_STORAGE_KEYS.currentTrackProject))
  if (isStoredProject(stored)) return stored

  const pieces = getPvcPieces()
  if (!pieces.length) return null
  return {
    name: '未命名项目',
    pieces,
    viewBox: { ...PVC_DESIGN_BOUNDS },
    timestamp: new Date().toISOString(),
  }
}

function addArchive(storage: Storage, project: StoredProject, date: Date) {
  if (!project.pieces.length) return null
  const name = createArchiveName(storage, date)
  const archive = { ...project, name, timestamp: date.toISOString() }
  storage.setItem(`${TRACK_STORAGE_KEYS.archivePrefix}${name}`, JSON.stringify(archive))

  const storedNames = safeJsonParse(storage.getItem(TRACK_STORAGE_KEYS.trackArchives))
  const names = Array.isArray(storedNames) ? storedNames.filter((item): item is string => typeof item === 'string') : []
  storage.setItem(TRACK_STORAGE_KEYS.trackArchives, JSON.stringify([...names, name]))
  return name
}

export function createPvcTrackDocument(pieces = getPvcPieces(), date = new Date()): PvcTrackDocument {
  const result = validatePvcTrackDocument({
    version: '1.0',
    created: date.toISOString(),
    bounds: PVC_DESIGN_BOUNDS,
    pieces,
  })
  if (result.valid === false) throw new Error(result.error)
  return result.document
}

export function importWorkshopTrack(
  document: PvcTrackDocument,
  title: string,
  storage: Storage = localStorage,
  date = new Date(),
) {
  const result = validatePvcTrackDocument(document)
  if (result.valid === false) throw new Error(result.error)

  const previousProject = currentProject(storage)
  const archiveName = previousProject ? addArchive(storage, previousProject, date) : null
  const project: StoredProject = {
    name: title.trim() || '工坊赛道',
    pieces: result.document.pieces,
    viewBox: { ...result.document.bounds },
    timestamp: date.toISOString(),
  }

  storage.setItem(TRACK_STORAGE_KEYS.currentTrackProject, JSON.stringify(project))
  if (typeof localStorage !== 'undefined' && storage === localStorage) {
    usePvcEditorStore.getState().setPieces(result.document.pieces)
    writePiecesHistory([result.document.pieces])
  }
  return { archiveName }
}

export function saveWorkshopTrackJson(document: PvcTrackDocument, title: string) {
  const safeTitle = title.trim().replace(/[<>:"/\\|?*]+/g, '_') || 'workshop-track'
  return saveTextFile(`${safeTitle}.json`, JSON.stringify(document, null, 2))
}

export function currentTrackSummary(document: PvcTrackDocument) {
  const stats = calculateTrackStats(document.pieces)
  return {
    pieceCount: stats.totalPieces,
    totalLength: Number(stats.totalLength),
  }
}

function trackPoints(piece: TrackPiece): Point[] {
  const rotation = (piece.rotation || 0) * Math.PI / 180
  if (piece.type === 'straight') {
    const length = piece.params.length * TRACK_RENDER_SCALE
    return [
      { x: piece.x, y: piece.y },
      { x: piece.x + length * Math.cos(rotation), y: piece.y + length * Math.sin(rotation) },
    ]
  }

  const radius = piece.params.radius * TRACK_RENDER_SCALE
  const steps = Math.max(8, Math.ceil(piece.params.angle / 4))
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = rotation + (piece.params.angle * index / steps) * Math.PI / 180
    return { x: piece.x + radius * Math.cos(angle), y: piece.y + radius * Math.sin(angle) }
  })
}

function previewBounds(pieces: TrackPiece[]) {
  const points = pieces.flatMap(trackPoints)
  const halfWidth = TRACK_WIDTH * TRACK_RENDER_SCALE / 2
  const minX = Math.min(...points.map((point) => point.x)) - halfWidth
  const maxX = Math.max(...points.map((point) => point.x)) + halfWidth
  const minY = Math.min(...points.map((point) => point.y)) - halfWidth
  const maxY = Math.max(...points.map((point) => point.y)) + halfWidth
  return { minX, minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) }
}

function drawPiece(context: CanvasRenderingContext2D, piece: TrackPiece, color: string, width: number) {
  context.beginPath()
  if (piece.type === 'straight') {
    const rotation = (piece.rotation || 0) * Math.PI / 180
    const length = piece.params.length * TRACK_RENDER_SCALE
    context.moveTo(piece.x, piece.y)
    context.lineTo(piece.x + length * Math.cos(rotation), piece.y + length * Math.sin(rotation))
  } else {
    const radius = piece.params.radius * TRACK_RENDER_SCALE
    const start = (piece.rotation || 0) * Math.PI / 180
    const end = start + piece.params.angle * Math.PI / 180
    context.arc(piece.x, piece.y, radius, start, end)
  }
  context.strokeStyle = color
  context.lineWidth = width
  context.lineCap = 'butt'
  context.lineJoin = 'round'
  context.stroke()
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((webp) => {
      if (webp) {
        resolve(webp)
        return
      }
      canvas.toBlob((png) => png ? resolve(png) : reject(new Error('无法生成赛道预览图')), 'image/png')
    }, 'image/webp', 0.9)
  })
}

export async function createPvcTrackPreview(document: PvcTrackDocument) {
  const result = validatePvcTrackDocument(document)
  if (result.valid === false) throw new Error(result.error)

  const canvas = window.document.createElement('canvas')
  canvas.width = PREVIEW_WIDTH
  canvas.height = PREVIEW_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前环境无法生成赛道预览图')

  context.fillStyle = '#f4f6f8'
  context.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT)
  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 1
  for (let x = 0; x <= PREVIEW_WIDTH; x += 48) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, PREVIEW_HEIGHT)
    context.stroke()
  }
  for (let y = 0; y <= PREVIEW_HEIGHT; y += 48) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(PREVIEW_WIDTH, y)
    context.stroke()
  }

  const bounds = previewBounds(result.document.pieces)
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / bounds.width,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / bounds.height,
  )
  const offsetX = (PREVIEW_WIDTH - bounds.width * scale) / 2 - bounds.minX * scale
  const offsetY = (PREVIEW_HEIGHT - bounds.height * scale) / 2 - bounds.minY * scale

  context.save()
  context.setTransform(scale, 0, 0, scale, offsetX, offsetY)
  for (const piece of result.document.pieces) {
    drawPiece(context, piece, '#475569', TRACK_WIDTH * TRACK_RENDER_SCALE + 6 / scale)
    drawPiece(context, piece, '#dce3ea', TRACK_WIDTH * TRACK_RENDER_SCALE)
  }
  context.restore()

  return canvasBlob(canvas)
}
