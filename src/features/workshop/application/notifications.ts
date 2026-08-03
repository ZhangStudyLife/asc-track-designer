import { isTauriRuntime } from '../../../shared/platform/runtime'

export const WINDOWS_NOTIFICATION_KEY = 'workshopWindowsNotifications'

export function workshopNotificationsEnabled() {
  return localStorage.getItem(WINDOWS_NOTIFICATION_KEY) === 'true'
}

export async function setWorkshopNotificationsEnabled(enabled: boolean) {
  if (!enabled) {
    localStorage.setItem(WINDOWS_NOTIFICATION_KEY, 'false')
    return false
  }
  if (!isTauriRuntime()) return false

  const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
  const permission = await isPermissionGranted() || await requestPermission() === 'granted'
  localStorage.setItem(WINDOWS_NOTIFICATION_KEY, String(permission))
  return permission
}

export async function showWorkshopNotification(message: string) {
  if (!isTauriRuntime() || !workshopNotificationsEnabled()) return
  const { isPermissionGranted, sendNotification } = await import('@tauri-apps/plugin-notification')
  if (!await isPermissionGranted()) return
  sendNotification({ title: 'ASC 赛道创意工坊', body: message })
}
