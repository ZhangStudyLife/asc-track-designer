import type { TrackPiece } from './types'

export const TRACK_STORAGE_KEYS = {
  piecesHistory: 'piecesHistory',
  trackSizes: 'trackSizes',
  hiddenFixedSizes: 'hiddenFixedSizes',
  trackArchives: 'trackArchives',
  currentTrackProject: 'currentTrackProject',
  archivePrefix: 'archive_',
} as const

export function pushPiecesHistory(pieces: TrackPiece[]) {
  let history = JSON.parse(localStorage.getItem(TRACK_STORAGE_KEYS.piecesHistory) || '[]')
  if (!history.length || JSON.stringify(history[history.length - 1]) !== JSON.stringify(pieces)) {
    history.push(pieces)
    if (history.length > 100) history = history.slice(-100)
    localStorage.setItem(TRACK_STORAGE_KEYS.piecesHistory, JSON.stringify(history))
  }
}

export function readPiecesHistory(): TrackPiece[][] {
  return JSON.parse(localStorage.getItem(TRACK_STORAGE_KEYS.piecesHistory) || '[]')
}

export function writePiecesHistory(history: TrackPiece[][]) {
  localStorage.setItem(TRACK_STORAGE_KEYS.piecesHistory, JSON.stringify(history))
}
