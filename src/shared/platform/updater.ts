import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from './runtime'
import type { DownloadProgress, DownloadedUpdate, UpdateRelease } from '../../features/updater/types'

export function supportsDesktopUpdater() {
  return isTauriRuntime()
}

export function checkForUpdate() {
  if (!supportsDesktopUpdater()) return Promise.resolve<UpdateRelease | null>(null)
  return invoke<UpdateRelease | null>('check_for_update')
}

export async function downloadUpdate(
  version: string,
  onProgress: (progress: DownloadProgress) => void,
) {
  if (!supportsDesktopUpdater()) throw new Error('网页版不支持 EXE 自动更新')

  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<DownloadProgress>('updater://progress', (event) => {
    onProgress(event.payload)
  })

  try {
    return await invoke<DownloadedUpdate>('download_update', { version })
  } finally {
    await unlisten()
  }
}

export function installUpdate(path: string) {
  if (!supportsDesktopUpdater()) return Promise.reject(new Error('网页版不支持 EXE 自动更新'))
  return invoke<void>('install_update', { path })
}

export function confirmUpdateStartup() {
  if (!supportsDesktopUpdater()) return Promise.resolve(false)
  return invoke<boolean>('confirm_update_startup')
}
