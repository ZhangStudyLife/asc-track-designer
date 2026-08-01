import type { TrackPiece, TrackStats } from './types'

export function calculateTrackStats(pieces: TrackPiece[]): TrackStats {
  const bomStats: Record<string, number> = {}
  let totalLength = 0

  pieces.forEach((piece) => {
    let pieceKey = ''
    let pieceLength = 0

    if (piece.type === 'straight') {
      pieceKey = `L${piece.params.length}`
      pieceLength = piece.params.length
    } else if (piece.type === 'curve') {
      pieceKey = `R${piece.params.radius}-${piece.params.angle}`
      const angleInRadians = (piece.params.angle * Math.PI) / 180
      pieceLength = piece.params.radius * angleInRadians
    }

    bomStats[pieceKey] = (bomStats[pieceKey] || 0) + 1
    totalLength += pieceLength
  })

  return {
    bom: bomStats,
    totalLength: (totalLength / 100).toFixed(2),
    totalPieces: pieces.length,
  }
}
