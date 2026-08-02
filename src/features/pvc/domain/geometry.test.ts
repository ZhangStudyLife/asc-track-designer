import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAutoFillStraight,
  findNearestConnectionPointInTargets,
  getConnectionPoint,
  getConnectionPoints,
  getDistance,
  getMeasurementDistances,
  getSnapTargets,
  getStraightCornerPoints,
  getTrackPieceVisualCenter,
  resolveMeasurementPoint,
  SNAP_DISTANCE,
  TRACK_RENDER_SCALE,
  TRACK_WIDTH,
} from './geometry'
import type { TrackPiece } from './types'

describe('track geometry compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the established render scale and snap distance', () => {
    expect(TRACK_RENDER_SCALE).toBe(2)
    expect(TRACK_WIDTH).toBe(45)
    expect(SNAP_DISTANCE).toBe(30)
  })

  it('calculates unrotated straight corners in canvas coordinates', () => {
    const points = getStraightCornerPoints({
      id: 1,
      type: 'straight',
      x: 100,
      y: 200,
      rotation: 0,
      params: { length: 50 },
    })

    expect(points).toEqual([
      { x: 100, y: 155, corner: 'start-top' },
      { x: 100, y: 245, corner: 'start-bottom' },
      { x: 200, y: 155, corner: 'end-top' },
      { x: 200, y: 245, corner: 'end-bottom' },
    ])
  })

  it('rotates straight corners around the piece origin', () => {
    const points = getStraightCornerPoints({
      id: 1,
      type: 'straight',
      x: 100,
      y: 200,
      rotation: 90,
      params: { length: 50 },
    })

    expect(points[0].x).toBeCloseTo(145)
    expect(points[0].y).toBeCloseTo(200)
    expect(points[1].x).toBeCloseTo(55)
    expect(points[1].y).toBeCloseTo(200)
    expect(points[2].x).toBeCloseTo(145)
    expect(points[2].y).toBeCloseTo(300)
    expect(points[3].x).toBeCloseTo(55)
    expect(points[3].y).toBeCloseTo(300)
  })

  it('calculates rotated straight endpoints', () => {
    const points = getConnectionPoints({
      id: 1,
      type: 'straight',
      x: 100,
      y: 200,
      rotation: 30,
      params: { length: 50 },
    })

    expect(points[0]).toEqual({ x: 100, y: 200, angle: 30, type: 'start' })
    expect(points[1].x).toBeCloseTo(186.6025403784)
    expect(points[1].y).toBeCloseTo(250)
    expect(points[1].angle).toBe(210)
    expect(points[1].type).toBe('end')
  })

  it('calculates curve endpoints with the current center convention', () => {
    const points = getConnectionPoints({
      id: 2,
      type: 'curve',
      x: 100,
      y: 100,
      rotation: 0,
      params: { radius: 50, angle: 90 },
    })

    expect(points[0]).toEqual({ x: 200, y: 100, angle: -90, type: 'start' })
    expect(points[1].x).toBeCloseTo(100)
    expect(points[1].y).toBeCloseTo(200)
    expect(points[1].angle).toBe(0)
    expect(points[1].type).toBe('end')
  })

  it('uses the visible track midpoint for selection', () => {
    const straightCenter = getTrackPieceVisualCenter({
      id: 1,
      type: 'straight',
      x: 100,
      y: 200,
      rotation: 90,
      params: { length: 50 },
    })
    expect(straightCenter.x).toBeCloseTo(100)
    expect(straightCenter.y).toBeCloseTo(250)

    const curveCenter = getTrackPieceVisualCenter({
      id: 2,
      type: 'curve',
      x: 100,
      y: -100,
      rotation: 90,
      params: { radius: 50, angle: 90 },
    })
    expect(curveCenter.x).toBeCloseTo(29.2893218813)
    expect(curveCenter.y).toBeCloseTo(-29.2893218813)
  })

  it('finds the nearest snap and preserves the strict distance threshold', () => {
    const fixed: TrackPiece = {
      id: 1,
      type: 'straight',
      x: 0,
      y: 0,
      rotation: 0,
      params: { length: 50 },
    }
    const dragged: TrackPiece = {
      id: 2,
      type: 'straight',
      x: 200,
      y: 100,
      rotation: 0,
      params: { length: 25 },
    }
    const targets = getSnapTargets([fixed, dragged], dragged.id)

    const snap = findNearestConnectionPointInTargets(dragged, targets, 98, 2)
    expect(snap?.targetX).toBe(100)
    expect(snap?.targetY).toBe(0)
    expect(snap?.distance).toBeCloseTo(Math.sqrt(8))

    expect(findNearestConnectionPointInTargets(dragged, targets, 130, 0)).toBeNull()
  })

  it('creates the same straight auto-fill between selected endpoints', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    const pieces: TrackPiece[] = [
      { id: 1, type: 'straight', x: 0, y: 0, rotation: 0, params: { length: 50 } },
      { id: 2, type: 'straight', x: 300, y: 200, rotation: 0, params: { length: 50 } },
    ]

    const piece = createAutoFillStraight(pieces, [
      { pieceId: 1, type: 'end' },
      { pieceId: 2, type: 'start' },
    ])

    expect(piece.id).toBe(1234)
    expect(piece.x).toBe(100)
    expect(piece.y).toBe(0)
    expect(piece.rotation).toBeCloseTo(45)
    expect(piece.params.length).toBeCloseTo(Math.sqrt(200 ** 2 + 200 ** 2) / 2)
    expect(getConnectionPoint(pieces, { pieceId: 999, type: 'start' })).toEqual({ x: 0, y: 0 })
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('resolves connection, straight-corner, and canvas measurement references', () => {
    const pieces: TrackPiece[] = [
      { id: 1, type: 'straight', x: 10, y: 20, rotation: 0, params: { length: 50 } },
    ]

    expect(resolveMeasurementPoint(pieces, {
      kind: 'connection',
      pieceId: 1,
      type: 'end',
    })).toEqual({ x: 110, y: 20, angle: 180, type: 'end' })
    expect(resolveMeasurementPoint(pieces, {
      kind: 'straight-corner',
      pieceId: 1,
      corner: 'start-top',
    })).toEqual({ x: 10, y: -25, corner: 'start-top' })
    expect(resolveMeasurementPoint(pieces, {
      kind: 'canvas',
      x: 123,
      y: -456,
    })).toEqual({ x: 123, y: -456 })
  })

  it('returns null for missing pieces and curve corner references', () => {
    const pieces: TrackPiece[] = [
      { id: 2, type: 'curve', x: 0, y: 0, rotation: 0, params: { radius: 50, angle: 90 } },
    ]

    expect(resolveMeasurementPoint(pieces, {
      kind: 'connection',
      pieceId: 999,
      type: 'start',
    })).toBeNull()
    expect(resolveMeasurementPoint(pieces, {
      kind: 'straight-corner',
      pieceId: 999,
      corner: 'start-top',
    })).toBeNull()
    expect(resolveMeasurementPoint(pieces, {
      kind: 'straight-corner',
      pieceId: 2,
      corner: 'start-top',
    })).toBeNull()
  })

  it('calculates scaled 3-4-5 distances while preserving delta signs', () => {
    expect(getMeasurementDistances({ x: 2, y: 4 }, { x: 8, y: -4 })).toEqual({
      total: 5,
      deltaX: 3,
      deltaY: -4,
    })
    expect(getMeasurementDistances({ x: 8, y: -4 }, { x: 2, y: 4 })).toEqual({
      total: 5,
      deltaX: -3,
      deltaY: 4,
    })
  })
})
