import type { TrackPiece } from './types'

export const TRACK_STORAGE_KEYS = {
  piecesHistory: 'piecesHistory',
  trackSizes: 'trackSizes',
  hiddenFixedSizes: 'hiddenFixedSizes',
  trackArchives: 'trackArchives',
  currentTrackProject: 'currentTrackProject',
  archivePrefix: 'archive_',
} as const

const HISTORY_LIMIT = 100
const HISTORY_WRITE_DELAY = 200

let historyCache: TrackPiece[][] | null = null
let historyWriteTimer: ReturnType<typeof setTimeout> | null = null

function getHistoryCache() {
  if (historyCache) return historyCache

  try {
    historyCache = JSON.parse(localStorage.getItem(TRACK_STORAGE_KEYS.piecesHistory) || '[]')
  } catch {
    historyCache = []
  }

  return historyCache
}

function persistPiecesHistory() {
  historyWriteTimer = null
  if (!historyCache) return

  let history = historyCache

  while (history.length > 0) {
    try {
      localStorage.setItem(TRACK_STORAGE_KEYS.piecesHistory, JSON.stringify(history))
      historyCache = history
      return
    } catch {
      if (history.length === 1) return
      history = history.slice(Math.max(1, Math.floor(history.length / 4)))
    }
  }
}

function schedulePiecesHistoryWrite() {
  if (historyWriteTimer) clearTimeout(historyWriteTimer)
  historyWriteTimer = setTimeout(persistPiecesHistory, HISTORY_WRITE_DELAY)
}

export function pushPiecesHistory(pieces: TrackPiece[]) {
  const history = getHistoryCache()
  if (!history.length || JSON.stringify(history[history.length - 1]) !== JSON.stringify(pieces)) {
    historyCache = [...history, pieces].slice(-HISTORY_LIMIT)
    schedulePiecesHistoryWrite()
  }
}

export function readPiecesHistory(): TrackPiece[][] {
  return [...getHistoryCache()]
}

export function writePiecesHistory(history: TrackPiece[][]) {
  historyCache = [...history].slice(-HISTORY_LIMIT)
  schedulePiecesHistoryWrite()
}

export function flushPiecesHistory() {
  if (historyWriteTimer) clearTimeout(historyWriteTimer)
  persistPiecesHistory()
}
