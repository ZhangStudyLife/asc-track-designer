import { describe, expect, it } from 'vitest'
import { calculateTrackStats } from './stats'

describe('track statistics compatibility', () => {
  it('keeps BOM keys, arc length, and meter formatting', () => {
    const stats = calculateTrackStats([
      { id: 1, type: 'straight', x: 0, y: 0, params: { length: 100 } },
      { id: 2, type: 'straight', x: 0, y: 0, params: { length: 100 } },
      { id: 3, type: 'curve', x: 0, y: 0, params: { radius: 50, angle: 90 } },
    ])

    expect(stats).toEqual({
      bom: { L100: 2, 'R50-90': 1 },
      totalLength: '2.79',
      totalPieces: 3,
    })
  })
})
