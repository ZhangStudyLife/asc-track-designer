import { beforeEach, describe, expect, it } from 'vitest'
import {
  hydrateHistoryCommands,
  recordHistoryCommand,
  redoHistoryCommand,
  resetHistoryCommands,
  undoHistoryCommand,
} from './history'
import type { TrackPiece } from '../domain/types'

const first: TrackPiece = { id: 1, type: 'straight', x: 0, y: 0, params: { length: 50 } }
const second: TrackPiece = { id: 2, type: 'curve', x: 100, y: 100, params: { radius: 50, angle: 90 } }

describe('incremental PVC history', () => {
  beforeEach(() => resetHistoryCommands())

  it('undoes and redoes only the changed piece values', () => {
    const moved = { ...first, x: 25 }
    expect(recordHistoryCommand([first, second], [moved, second])).toBe(true)

    const undone = undoHistoryCommand([moved, second])
    expect(undone).toEqual([first, second])
    expect(undone?.[1]).toBe(second)
    expect(redoHistoryCommand(undone!)).toEqual([moved, second])
  })

  it('preserves add, delete, and draw order', () => {
    recordHistoryCommand([first], [second, first])
    expect(undoHistoryCommand([second, first])).toEqual([first])
    expect(redoHistoryCommand([first])).toEqual([second, first])
  })

  it('hydrates commands from the legacy snapshot format', () => {
    const moved = { ...first, y: 40 }
    hydrateHistoryCommands([[first], [moved], [moved, second]])

    expect(undoHistoryCommand([moved, second])).toEqual([moved])
    expect(undoHistoryCommand([moved])).toEqual([first])
  })
})
