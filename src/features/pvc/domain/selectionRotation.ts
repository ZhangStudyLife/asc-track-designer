import { getTrackPieceVisualCenter } from './geometry'
import type { TrackPiece } from './types'

export function rotateTrackPieceSelection(
  pieces: TrackPiece[],
  selectedIds: ReadonlySet<number>,
  deltaDegrees: number,
): TrackPiece[] {
  const selectedPieces = pieces.filter((piece) => selectedIds.has(piece.id))
  if (selectedPieces.length === 0) return pieces

  if (selectedPieces.length === 1) {
    const selectedId = selectedPieces[0].id
    return pieces.map((piece) => piece.id === selectedId
      ? { ...piece, rotation: ((piece.rotation || 0) + deltaDegrees) % 360 }
      : piece)
  }

  const centers = selectedPieces.map(getTrackPieceVisualCenter)
  const pivot = {
    x: centers.reduce((sum, center) => sum + center.x, 0) / centers.length,
    y: centers.reduce((sum, center) => sum + center.y, 0) / centers.length,
  }
  const radians = deltaDegrees * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  return pieces.map((piece) => {
    if (!selectedIds.has(piece.id)) return piece

    const dx = piece.x - pivot.x
    const dy = piece.y - pivot.y
    return {
      ...piece,
      x: pivot.x + dx * cos - dy * sin,
      y: pivot.y + dx * sin + dy * cos,
      rotation: ((piece.rotation || 0) + deltaDegrees) % 360,
    }
  })
}
