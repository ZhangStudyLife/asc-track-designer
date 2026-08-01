import type { TrackPiece } from './types'

export function parseTrackCode(code: string): Pick<TrackPiece, 'type' | 'params'> | null {
  const normalized = code.trim().toUpperCase()

  if (normalized.startsWith('L')) {
    const length = parseFloat(normalized.slice(1))
    if (!isNaN(length)) {
      return { type: 'straight', params: { length } }
    }
  }

  if (normalized.startsWith('R')) {
    const match = normalized.match(/^R(\d+)(A(\d+))?$/)
    if (match) {
      const radius = parseFloat(match[1])
      const angle = match[3] ? parseFloat(match[3]) : 90
      if (!isNaN(radius) && !isNaN(angle)) {
        return { type: 'curve', params: { radius, angle } }
      }
    }
  }

  return null
}
