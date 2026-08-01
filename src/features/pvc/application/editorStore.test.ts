import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPvcPieces, resetPvcEditorStore, usePvcEditorStore } from './editorStore'
import type { TrackPiece } from '../domain/types'

const first: TrackPiece = {
  id: 1,
  type: 'straight',
  x: 0,
  y: 0,
  rotation: 0,
  params: { length: 50 },
}

const second: TrackPiece = {
  id: 2,
  type: 'curve',
  x: 100,
  y: 100,
  rotation: 0,
  params: { radius: 50, angle: 90 },
}

describe('PVC editor store', () => {
  beforeEach(() => resetPvcEditorStore())

  it('normalizes pieces while preserving draw order', () => {
    usePvcEditorStore.getState().setPieces([second, first])

    expect(usePvcEditorStore.getState().pieceIds).toEqual([2, 1])
    expect(getPvcPieces()).toEqual([second, first])
  })

  it('preserves unchanged piece references during an update', () => {
    usePvcEditorStore.getState().setPieces([first, second])
    usePvcEditorStore.getState().setPieces((pieces) => pieces.map((piece) => (
      piece.id === first.id ? { ...piece, x: 25 } : piece
    )))

    const pieces = getPvcPieces()
    expect(pieces[0]).not.toBe(first)
    expect(pieces[0].x).toBe(25)
    expect(pieces[1]).toBe(second)
  })

  it('notifies only the changed per-piece selector', () => {
    usePvcEditorStore.getState().setPieces([first, second])
    const firstListener = vi.fn()
    const secondListener = vi.fn()
    const unsubscribeFirst = usePvcEditorStore.subscribe((state) => state.piecesById[1], firstListener)
    const unsubscribeSecond = usePvcEditorStore.subscribe((state) => state.piecesById[2], secondListener)

    usePvcEditorStore.getState().setPieces((pieces) => pieces.map((piece) => (
      piece.id === first.id ? { ...piece, y: 40 } : piece
    )))

    expect(firstListener).toHaveBeenCalledTimes(1)
    expect(secondListener).not.toHaveBeenCalled()
    unsubscribeFirst()
    unsubscribeSecond()
  })
})
