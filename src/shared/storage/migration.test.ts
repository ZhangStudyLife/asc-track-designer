import { describe, expect, it } from 'vitest'
import {
  collectLegacyStorage,
  createLegacyStateEnvelope,
  parseLegacyStateEnvelope,
  restoreLegacyStorage,
  type StorageReader,
  type StorageWriter,
} from './migration'

class MemoryStorage implements StorageReader, StorageWriter {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('legacy desktop state migration', () => {
  it('collects exact keys and every archive entry', () => {
    const storage = new MemoryStorage()
    storage.setItem('currentTrackProject', '{"pieces":[]}')
    storage.setItem('archive_test', '{"pieces":[1]}')
    storage.setItem('trackDesignerTheme', 'dark')
    storage.setItem('unrelated', 'ignored')

    expect(collectLegacyStorage(storage)).toEqual({
      archive_test: '{"pieces":[1]}',
      currentTrackProject: '{"pieces":[]}',
      trackDesignerTheme: 'dark',
    })
  })

  it('round trips a valid versioned envelope', () => {
    const envelope = createLegacyStateEnvelope(
      { piecesHistory: '[[{"id":1}]]' },
      '2026-08-01T00:00:00.000Z',
    )

    expect(parseLegacyStateEnvelope(JSON.stringify(envelope))).toEqual(envelope)
  })

  it('rejects malformed, unknown, or future envelopes', () => {
    expect(parseLegacyStateEnvelope('{')).toBeNull()
    expect(parseLegacyStateEnvelope('{"version":2,"source":"electron","exportedAt":"x","values":{}}')).toBeNull()
    expect(parseLegacyStateEnvelope('{"version":1,"source":"electron","exportedAt":"x","values":{"unknown":"x"}}')).toBeNull()
    expect(parseLegacyStateEnvelope('{"version":1,"source":"electron","exportedAt":"x","values":{"trackSizes":1}}')).toBeNull()
  })

  it('does not overwrite newer destination state by default', () => {
    const storage = new MemoryStorage()
    storage.setItem('trackDesignerTheme', 'light')
    const envelope = createLegacyStateEnvelope({
      trackDesignerTheme: 'dark',
      currentTrackProject: '{"pieces":[]}',
    })

    expect(restoreLegacyStorage(storage, envelope)).toBe(1)
    expect(storage.getItem('trackDesignerTheme')).toBe('light')
    expect(storage.getItem('currentTrackProject')).toBe('{"pieces":[]}')
    expect(restoreLegacyStorage(storage, envelope, true)).toBe(2)
    expect(storage.getItem('trackDesignerTheme')).toBe('dark')
  })
})
