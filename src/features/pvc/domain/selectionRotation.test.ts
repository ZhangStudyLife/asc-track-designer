import { describe, expect, it } from 'vitest'
import { getConnectionPoints, getDistance, getTrackPieceVisualCenter } from './geometry'
import { rotateTrackPieceSelection } from './selectionRotation'
import type { TrackPiece } from './types'

const connectedPieces: TrackPiece[] = [
  { id: 1, type: 'straight', x: 0, y: 0, rotation: 0, params: { length: 50 } },
  { id: 2, type: 'curve', x: 100, y: -100, rotation: 90, params: { radius: 50, angle: 90 } },
  { id: 3, type: 'straight', x: 0, y: -100, rotation: 180, params: { length: 75 } },
]

describe('rotateTrackPieceSelection', () => {
  it('returns the original array when no existing piece is selected', () => {
    expect(rotateTrackPieceSelection(connectedPieces, new Set(), 15)).toBe(connectedPieces)
    expect(rotateTrackPieceSelection(connectedPieces, new Set([999]), 15)).toBe(connectedPieces)
  })

  it('keeps single-piece position compatibility while changing rotation', () => {
    const result = rotateTrackPieceSelection(connectedPieces, new Set([1]), -15)

    expect(result).not.toBe(connectedPieces)
    expect(result[0]).toMatchObject({ x: 0, y: 0, rotation: -15 })
    expect(result[1]).toBe(connectedPieces[1])
    expect(result[2]).toBe(connectedPieces[2])
  })

  it('keeps connected endpoints coincident after rigid group rotation', () => {
    const result = rotateTrackPieceSelection(connectedPieces, new Set([1, 2, 3]), -15)
    const firstEnd = getConnectionPoints(result[0])[1]
    const curveStart = getConnectionPoints(result[1])[0]
    const curveEnd = getConnectionPoints(result[1])[1]
    const lastStart = getConnectionPoints(result[2])[0]

    expect(getDistance(firstEnd, curveStart)).toBeCloseTo(0, 10)
    expect(getDistance(curveEnd, lastStart)).toBeCloseTo(0, 10)
  })

  it('preserves unselected piece references during group rotation', () => {
    const unselected: TrackPiece = {
      id: 4,
      type: 'straight',
      x: 500,
      y: 500,
      rotation: 45,
      params: { length: 25 },
    }
    const result = rotateTrackPieceSelection(
      [...connectedPieces, unselected],
      new Set([1, 2, 3]),
      15,
    )

    expect(result[3]).toBe(unselected)
  })

  it('returns close to the original layout after twenty-four 15-degree rotations', () => {
    const selectedIds = new Set([1, 2, 3])
    let result = connectedPieces

    for (let index = 0; index < 24; index += 1) {
      result = rotateTrackPieceSelection(result, selectedIds, 15)
    }

    result.forEach((piece, index) => {
      expect(piece.x).toBeCloseTo(connectedPieces[index].x, 10)
      expect(piece.y).toBeCloseTo(connectedPieces[index].y, 10)
      expect(piece.rotation).toBeCloseTo(connectedPieces[index].rotation || 0, 10)
    })
  })

  it('keeps an asymmetric selection centroid stable across repeated rotations', () => {
    const pieces: TrackPiece[] = [
      { id: 1, type: 'straight', x: 0, y: 0, rotation: 0, params: { length: 25 } },
      { id: 2, type: 'straight', x: 180, y: 40, rotation: 35, params: { length: 100 } },
      { id: 3, type: 'curve', x: -70, y: 220, rotation: -20, params: { radius: 70, angle: 45 } },
    ]
    const selectedIds = new Set(pieces.map((piece) => piece.id))
    const centroid = (items: TrackPiece[]) => {
      const centers = items.map(getTrackPieceVisualCenter)
      return {
        x: centers.reduce((sum, point) => sum + point.x, 0) / centers.length,
        y: centers.reduce((sum, point) => sum + point.y, 0) / centers.length,
      }
    }
    const before = centroid(pieces)
    let rotated = pieces

    for (let index = 0; index < 7; index += 1) {
      rotated = rotateTrackPieceSelection(rotated, selectedIds, 15)
      const current = centroid(rotated)
      expect(current.x).toBeCloseTo(before.x, 10)
      expect(current.y).toBeCloseTo(before.y, 10)
    }
  })
})
