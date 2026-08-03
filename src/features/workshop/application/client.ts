import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isTauriRuntime } from '../../../shared/platform/runtime'
import { workshopSecureStorage } from './desktopAuth'
import { isWorkshopConfigured, workshopConfig } from './config'

let client: SupabaseClient | null | undefined

export function getWorkshopClient() {
  if (client !== undefined) return client
  if (!isWorkshopConfigured()) {
    client = null
    return client
  }

  client = createClient(workshopConfig.supabaseUrl, workshopConfig.publishableKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: !isTauriRuntime(),
      persistSession: true,
      autoRefreshToken: true,
      storage: isTauriRuntime() ? workshopSecureStorage : undefined,
    },
  })
  return client
}

export function requireWorkshopClient() {
  const configuredClient = getWorkshopClient()
  if (!configuredClient) throw new Error('创意工坊服务尚未配置')
  return configuredClient
}
