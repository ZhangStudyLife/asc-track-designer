import { describe, expect, it } from 'vitest'
import { parsePvcTrackDocument, validatePvcTrackDocument } from './trackDocument'

const validDocument = {
  version: '1.0',
  created: '2026-08-03T12:00:00.000Z',
  bounds: { x: -1600, y: -800, width: 3200, height: 1600 },
  pieces: [
    { id: 1, type: 'straight', x: 100, y: 200, rotation: 0, params: { length: 50 } },
    { id: 2, type: 'curve', x: 200, y: 200, rotation: 30, params: { radius: 50, angle: 45 } },
  ],
}

describe('workshop PVC track document', () => {
  it('accepts the existing exported PVC format', () => {
    const result = validatePvcTrackDocument(validDocument)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.document.pieces).toHaveLength(2)
  })

  it('rejects unsupported pieces and non-finite geometry', () => {
    expect(validatePvcTrackDocument({
      ...validDocument,
      pieces: [{ id: 1, type: 'beacon', x: 0, y: 0, params: {} }],
    }).valid).toBe(false)
    expect(validatePvcTrackDocument({
      ...validDocument,
      pieces: [{ id: 1, type: 'straight', x: Number.POSITIVE_INFINITY, y: 0, params: { length: 50 } }],
    }).valid).toBe(false)
  })

  it('rejects duplicate IDs and more than 200 pieces', () => {
    expect(validatePvcTrackDocument({
      ...validDocument,
      pieces: [validDocument.pieces[0], validDocument.pieces[0]],
    }).valid).toBe(false)

    const pieces = Array.from({ length: 201 }, (_, id) => ({
      id,
      type: 'straight',
      x: id,
      y: 0,
      params: { length: 50 },
    }))
    expect(validatePvcTrackDocument({ ...validDocument, pieces }).valid).toBe(false)
  })

  it('returns stable errors for malformed and oversized JSON', () => {
    expect(parsePvcTrackDocument('{').valid).toBe(false)
    expect(parsePvcTrackDocument(`{"padding":"${'x'.repeat(2 * 1024 * 1024)}"}`).valid).toBe(false)
  })
})
