export const STORAGE_SCHEMA_KEY = 'ascStorageSchemaVersion'
export const CURRENT_STORAGE_SCHEMA = 1

type SchemaStorage = Pick<Storage, 'getItem' | 'setItem'>

export type StorageSchemaResult =
  | { status: 'initialized' | 'current'; version: typeof CURRENT_STORAGE_SCHEMA }
  | { status: 'future'; version: number }

export function initializeStorageSchema(storage: SchemaStorage = localStorage): StorageSchemaResult {
  const rawVersion = storage.getItem(STORAGE_SCHEMA_KEY)
  if (rawVersion === null) {
    storage.setItem(STORAGE_SCHEMA_KEY, String(CURRENT_STORAGE_SCHEMA))
    return { status: 'initialized', version: CURRENT_STORAGE_SCHEMA }
  }

  const version = Number(rawVersion)
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('存储 schema 版本无效')
  }
  if (version > CURRENT_STORAGE_SCHEMA) return { status: 'future', version }
  return { status: 'current', version: CURRENT_STORAGE_SCHEMA }
}
