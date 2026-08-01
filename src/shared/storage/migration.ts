import { TRACK_STORAGE_KEYS } from '../../features/pvc/application/storage'

export const LEGACY_STATE_VERSION = 1

export type StorageReader = Pick<Storage, 'length' | 'key' | 'getItem'>
export type StorageWriter = Pick<Storage, 'getItem' | 'setItem'>

export type LegacyStateEnvelope = {
  version: typeof LEGACY_STATE_VERSION
  source: 'electron'
  exportedAt: string
  values: Record<string, string>
}

const EXACT_KEYS = new Set<string>([
  TRACK_STORAGE_KEYS.piecesHistory,
  TRACK_STORAGE_KEYS.trackSizes,
  TRACK_STORAGE_KEYS.hiddenFixedSizes,
  TRACK_STORAGE_KEYS.trackArchives,
  TRACK_STORAGE_KEYS.currentTrackProject,
  TRACK_STORAGE_KEYS.theme,
])

export function isLegacyStorageKey(key: string) {
  return EXACT_KEYS.has(key) || key.startsWith(TRACK_STORAGE_KEYS.archivePrefix)
}

export function collectLegacyStorage(storage: StorageReader) {
  const values: Record<string, string> = {}

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !isLegacyStorageKey(key)) continue

    const value = storage.getItem(key)
    if (value !== null) values[key] = value
  }

  return Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)))
}

export function createLegacyStateEnvelope(
  values: Record<string, string>,
  exportedAt = new Date().toISOString(),
): LegacyStateEnvelope {
  return {
    version: LEGACY_STATE_VERSION,
    source: 'electron',
    exportedAt,
    values,
  }
}

export function parseLegacyStateEnvelope(text: string): LegacyStateEnvelope | null {
  try {
    const value = JSON.parse(text) as Partial<LegacyStateEnvelope>
    if (
      value.version !== LEGACY_STATE_VERSION
      || value.source !== 'electron'
      || typeof value.exportedAt !== 'string'
      || !value.values
      || Array.isArray(value.values)
      || typeof value.values !== 'object'
      || Object.entries(value.values).some(([key, entry]) => !isLegacyStorageKey(key) || typeof entry !== 'string')
    ) {
      return null
    }

    return value as LegacyStateEnvelope
  } catch {
    return null
  }
}

export function restoreLegacyStorage(
  storage: StorageWriter,
  envelope: LegacyStateEnvelope,
  overwrite = false,
) {
  let restored = 0

  for (const [key, value] of Object.entries(envelope.values)) {
    if (!overwrite && storage.getItem(key) !== null) continue
    storage.setItem(key, value)
    restored += 1
  }

  return restored
}
