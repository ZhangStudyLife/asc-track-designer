import type {
  ConnectionPoint,
  ConnectionPointRef,
  MeasurementPointRef,
  SnapResult,
  StraightCornerKind,
  TrackPiece,
  TrackPoint,
} from './types'

export const TRACK_RENDER_SCALE = 2
export const TRACK_WIDTH = 45
export const SNAP_DISTANCE = 30

export function getDistance(a: TrackPoint, b: TrackPoint) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function getTrackPieceVisualCenter(piece: TrackPiece): TrackPoint {
  if (piece.type === 'straight') {
    const offset = piece.params.length * TRACK_RENDER_SCALE / 2
    const angle = (piece.rotation || 0) * Math.PI / 180
    return {
      x: piece.x + offset * Math.cos(angle),
      y: piece.y + offset * Math.sin(angle),
    }
  }

  const radius = piece.params.radius * TRACK_RENDER_SCALE
  const angle = ((piece.rotation || 0) + piece.params.angle / 2) * Math.PI / 180
  return {
    x: piece.x + radius * Math.cos(angle),
    y: piece.y + radius * Math.sin(angle),
  }
}

export function getConnectionPoints(piece: TrackPiece): ConnectionPoint[] {
  if (piece.type === 'straight') {
    const length = piece.params.length * TRACK_RENDER_SCALE
    const rad = (piece.rotation || 0) * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    return [
      { x: piece.x, y: piece.y, angle: piece.rotation || 0, type: 'start' },
      {
        x: piece.x + length * cos,
        y: piece.y + length * sin,
        angle: (piece.rotation || 0) + 180,
        type: 'end',
      },
    ]
  }

  if (piece.type === 'curve') {
    const centerRadius = piece.params.radius * TRACK_RENDER_SCALE
    const angleRad = (piece.params.angle * Math.PI) / 180
    const rotRad = (piece.rotation || 0) * Math.PI / 180
    const endAngle = angleRad + rotRad

    return [
      {
        x: piece.x + centerRadius * Math.cos(rotRad),
        y: piece.y + centerRadius * Math.sin(rotRad),
        angle: (piece.rotation || 0) - 90,
        type: 'start',
      },
      {
        x: piece.x + centerRadius * Math.cos(endAngle),
        y: piece.y + centerRadius * Math.sin(endAngle),
        angle: (piece.rotation || 0) + piece.params.angle - 90,
        type: 'end',
      },
    ]
  }

  return []
}

export function getConnectionPoint(pieces: TrackPiece[], ref: ConnectionPointRef): TrackPoint {
  const piece = pieces.find((item) => item.id === ref.pieceId)
  if (!piece) return { x: 0, y: 0 }
  return getConnectionPoints(piece).find((point) => point.type === ref.type) || { x: 0, y: 0 }
}

export function getStraightCornerPoints(piece: TrackPiece): Array<TrackPoint & { corner: StraightCornerKind }> {
  if (piece.type !== 'straight') return []

  const length = piece.params.length * TRACK_RENDER_SCALE
  const rad = (piece.rotation || 0) * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const localPoints: Array<TrackPoint & { corner: StraightCornerKind }> = [
    { x: 0, y: -TRACK_WIDTH, corner: 'start-top' },
    { x: 0, y: TRACK_WIDTH, corner: 'start-bottom' },
    { x: length, y: -TRACK_WIDTH, corner: 'end-top' },
    { x: length, y: TRACK_WIDTH, corner: 'end-bottom' },
  ]

  return localPoints.map((point) => ({
    corner: point.corner,
    x: piece.x + point.x * cos - point.y * sin,
    y: piece.y + point.x * sin + point.y * cos,
  }))
}

export function resolveMeasurementPoint(pieces: TrackPiece[], ref: MeasurementPointRef): TrackPoint | null {
  if (ref.kind === 'canvas') return { x: ref.x, y: ref.y }

  const piece = pieces.find((item) => item.id === ref.pieceId)
  if (!piece) return null

  if (ref.kind === 'connection') {
    return getConnectionPoints(piece).find((point) => point.type === ref.type) || null
  }

  if (piece.type !== 'straight') return null
  return getStraightCornerPoints(piece).find((point) => point.corner === ref.corner) || null
}

export function getMeasurementDistances(a: TrackPoint, b: TrackPoint) {
  const deltaX = (b.x - a.x) / TRACK_RENDER_SCALE
  const deltaY = (b.y - a.y) / TRACK_RENDER_SCALE
  return {
    total: Math.sqrt(deltaX ** 2 + deltaY ** 2),
    deltaX,
    deltaY,
  }
}

export function getSnapTargets(pieces: TrackPiece[], excludedPieceId: number): ConnectionPoint[] {
  return pieces.flatMap((piece) => piece.id === excludedPieceId ? [] : getConnectionPoints(piece))
}

export function findNearestConnectionPointInTargets(
  draggedPiece: TrackPiece,
  targets: ConnectionPoint[],
  newX: number,
  newY: number,
  snapDistance = SNAP_DISTANCE,
): SnapResult {
  const draggedPoints = getConnectionPoints({ ...draggedPiece, x: newX, y: newY })
  let bestSnap: SnapResult = null
  let minDistance = snapDistance

  for (const otherPoint of targets) {
    for (const draggedPoint of draggedPoints) {
      const distance = getDistance(draggedPoint, otherPoint)

      if (distance < minDistance) {
        minDistance = distance
        bestSnap = {
          targetX: otherPoint.x - (draggedPoint.x - newX),
          targetY: otherPoint.y - (draggedPoint.y - newY),
          distance,
          draggedPoint,
          otherPoint,
        }
      }
    }
  }

  return bestSnap
}

export function createAutoFillStraight(pieces: TrackPiece[], refs: [ConnectionPointRef, ConnectionPointRef]): TrackPiece {
  const pt1 = getConnectionPoint(pieces, refs[0])
  const pt2 = getConnectionPoint(pieces, refs[1])
  const dx = pt2.x - pt1.x
  const dy = pt2.y - pt1.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  return {
    id: Date.now(),
    type: 'straight',
    params: { length: dist / TRACK_RENDER_SCALE },
    x: pt1.x,
    y: pt1.y,
    rotation: Math.atan2(dy, dx) * 180 / Math.PI,
  }
}
