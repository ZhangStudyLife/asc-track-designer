import { describe, expect, it } from 'vitest'
import { parseTrackCode } from './parser'

describe('track code parser compatibility', () => {
  it('parses straight and curve codes case-insensitively', () => {
    expect(parseTrackCode(' l37.5 ')).toEqual({ type: 'straight', params: { length: 37.5 } })
    expect(parseTrackCode('R50')).toEqual({ type: 'curve', params: { radius: 50, angle: 90 } })
    expect(parseTrackCode('r70a45')).toEqual({ type: 'curve', params: { radius: 70, angle: 45 } })
  })

  it('rejects malformed codes using the existing rules', () => {
    expect(parseTrackCode('')).toBeNull()
    expect(parseTrackCode('X50')).toBeNull()
    expect(parseTrackCode('R50A')).toBeNull()
    expect(parseTrackCode('R50.5A45')).toBeNull()
  })
})
