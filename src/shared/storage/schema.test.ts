import { describe, expect, it } from 'vitest'
import { CURRENT_STORAGE_SCHEMA, initializeStorageSchema, STORAGE_SCHEMA_KEY } from './schema'

function createStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('storage schema', () => {
  it('registers schema v1 without rewriting existing user data', () => {
    const storage = createStorage({
      currentTrackProject: '{"pieces":[{"id":"track-1"}]}',
      piecesHistory: '[[{"id":"track-1"}]]',
      pvcEditorSettings: '{"version":1}',
    })
    const before = Object.fromEntries(storage.values)

    expect(initializeStorageSchema(storage)).toEqual({ status: 'initialized', version: 1 })
    expect(storage.values.get(STORAGE_SCHEMA_KEY)).toBe(String(CURRENT_STORAGE_SCHEMA))
    expect(Object.fromEntries([...storage.values].filter(([key]) => key !== STORAGE_SCHEMA_KEY))).toEqual(before)
  })

  it('does not overwrite data from a future schema', () => {
    const storage = createStorage({ [STORAGE_SCHEMA_KEY]: '2', currentTrackProject: 'keep' })
    expect(initializeStorageSchema(storage)).toEqual({ status: 'future', version: 2 })
    expect(storage.values.get('currentTrackProject')).toBe('keep')
  })

  it('rejects malformed schema versions', () => {
    const storage = createStorage({ [STORAGE_SCHEMA_KEY]: 'invalid' })
    expect(() => initializeStorageSchema(storage)).toThrow('存储 schema 版本无效')
  })
})
