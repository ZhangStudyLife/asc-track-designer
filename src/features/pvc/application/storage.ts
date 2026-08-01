import type { TrackPiece } from '../domain/types'
import {
  hydrateHistoryCommands,
  recordHistoryCommand,
  redoHistoryCommand,
  undoHistoryCommand,
} from './history'

export const TRACK_STORAGE_KEYS = {
  piecesHistory: 'piecesHistory',
  trackSizes: 'trackSizes',
  hiddenFixedSizes: 'hiddenFixedSizes',
  trackArchives: 'trackArchives',
  currentTrackProject: 'currentTrackProject',
  theme: 'trackDesignerTheme',
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

  hydrateHistoryCommands(historyCache)

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
    if (history.length) recordHistoryCommand(history[history.length - 1], pieces)
    historyCache = [...history, pieces].slice(-HISTORY_LIMIT)
    schedulePiecesHistoryWrite()
  }
}

export function readPiecesHistory(): TrackPiece[][] {
  return [...getHistoryCache()]
}

export function writePiecesHistory(history: TrackPiece[][]) {
  historyCache = [...history].slice(-HISTORY_LIMIT)
  hydrateHistoryCommands(historyCache)
  schedulePiecesHistoryWrite()
}

export function undoPiecesHistory(current: TrackPiece[]) {
  const history = getHistoryCache()
  const previous = undoHistoryCommand(current)
  if (!previous) return null

  historyCache = history.slice(0, -1)
  schedulePiecesHistoryWrite()
  return previous
}

export function redoPiecesHistory(current: TrackPiece[]) {
  getHistoryCache()
  const next = redoHistoryCommand(current)
  if (!next) return null

  historyCache = [...(historyCache || []), next].slice(-HISTORY_LIMIT)
  schedulePiecesHistoryWrite()
  return next
}

export function flushPiecesHistory() {
  if (historyWriteTimer) clearTimeout(historyWriteTimer)
  persistPiecesHistory()
}
