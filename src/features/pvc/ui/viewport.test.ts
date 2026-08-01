import { describe, expect, it } from 'vitest'
import { easeViewBox, normalizeWheelDelta, zoomViewBox } from './viewport'

const initial = { x: -1600, y: -800, width: 3200, height: 1600 }

describe('canvas viewport zoom', () => {
  it('uses the real wheel magnitude for continuous zoom', () => {
    const anchor = { x: 0, y: 0 }
    const small = zoomViewBox(initial, anchor, -10)
    const large = zoomViewBox(initial, anchor, -100)

    expect(initial.width - small.width).toBeGreaterThan(0)
    expect(initial.width - large.width).toBeGreaterThan(initial.width - small.width)
  })

  it('keeps the pointer anchor at the same relative viewport position', () => {
    const anchor = { x: 500, y: -200 }
    const next = zoomViewBox(initial, anchor, -120)

    expect((anchor.x - next.x) / next.width).toBeCloseTo((anchor.x - initial.x) / initial.width)
    expect((anchor.y - next.y) / next.height).toBeCloseTo((anchor.y - initial.y) / initial.height)
  })

  it('normalizes wheel delta modes and respects zoom limits', () => {
    expect(normalizeWheelDelta(2, 0, 900)).toBe(2)
    expect(normalizeWheelDelta(2, 1, 900)).toBe(32)
    expect(normalizeWheelDelta(2, 2, 900)).toBe(1800)

    let zoomedIn = initial
    let zoomedOut = initial
    for (let index = 0; index < 20; index += 1) {
      zoomedIn = zoomViewBox(zoomedIn, { x: 0, y: 0 }, -600)
      zoomedOut = zoomViewBox(zoomedOut, { x: 0, y: 0 }, 600)
    }
    expect(zoomedIn.width).toBeCloseTo(400)
    expect(zoomedOut.width).toBeCloseTo(1000 / 0.18)
  })

  it('eases toward the target and finishes exactly', () => {
    const target = { x: -1000, y: -500, width: 2000, height: 1000 }
    const halfway = easeViewBox(initial, target, 0.5)

    expect(halfway.width).toBeGreaterThan(target.width)
    expect(halfway.width).toBeLessThan(initial.width)
    expect(halfway.width).toBeCloseTo(2150)
    expect(easeViewBox(initial, target, 1)).toEqual(target)
  })
})
