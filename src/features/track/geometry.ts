import type { ConnectionPoint, ConnectionPointRef, SnapResult, TrackPiece, TrackPoint } from './types'

export const TRACK_RENDER_SCALE = 2
export const SNAP_DISTANCE = 30

export function getDistance(a: TrackPoint, b: TrackPoint) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
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

export function findNearestConnectionPoint(
  draggedPiece: TrackPiece,
  pieces: TrackPiece[],
  newX: number,
  newY: number,
  snapDistance = SNAP_DISTANCE,
): SnapResult {
  const draggedPoints = getConnectionPoints({ ...draggedPiece, x: newX, y: newY })
  let bestSnap: SnapResult = null
  let minDistance = snapDistance

  for (const otherPiece of pieces) {
    if (otherPiece.id === draggedPiece.id) continue

    const otherPoints = getConnectionPoints(otherPiece)

    for (const draggedPoint of draggedPoints) {
      for (const otherPoint of otherPoints) {
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
