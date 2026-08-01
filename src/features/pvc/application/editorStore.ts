import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { TrackPiece } from '../domain/types'

export type PiecesUpdater = TrackPiece[] | ((pieces: TrackPiece[]) => TrackPiece[])

type PvcEditorState = {
  pieceIds: number[]
  piecesById: Record<number, TrackPiece>
  revision: number
  setPieces: (updater: PiecesUpdater) => void
}

export function selectPvcPieces(state: Pick<PvcEditorState, 'pieceIds' | 'piecesById'>) {
  return state.pieceIds.map((id) => state.piecesById[id]).filter(Boolean)
}

function normalizePieces(pieces: TrackPiece[]) {
  const pieceIds: number[] = []
  const piecesById: Record<number, TrackPiece> = {}

  for (const piece of pieces) {
    pieceIds.push(piece.id)
    piecesById[piece.id] = piece
  }

  return { pieceIds, piecesById }
}

export const usePvcEditorStore = create<PvcEditorState>()(subscribeWithSelector((set, get) => ({
  pieceIds: [],
  piecesById: {},
  revision: 0,
  setPieces: (updater) => {
    const currentPieces = selectPvcPieces(get())
    const nextPieces = typeof updater === 'function' ? updater(currentPieces) : updater
    if (nextPieces === currentPieces) return

    set((state) => ({
      ...normalizePieces(nextPieces),
      revision: state.revision + 1,
    }))
  },
})))

export function getPvcPieces() {
  return selectPvcPieces(usePvcEditorStore.getState())
}

export function resetPvcEditorStore() {
  usePvcEditorStore.setState({ pieceIds: [], piecesById: {}, revision: 0 })
}
