import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from '../platform/runtime'
import { parseLegacyStateEnvelope, restoreLegacyStorage } from './migration'

export async function importLegacyDesktopState() {
  if (!isTauriRuntime()) return 0

  const text = await invoke<string | null>('read_legacy_migration')
  if (!text) return 0

  const envelope = parseLegacyStateEnvelope(text)
  if (!envelope) throw new Error('Legacy migration state is invalid')

  const restored = restoreLegacyStorage(localStorage, envelope)
  await invoke('mark_legacy_migration_imported')
  return restored
}
