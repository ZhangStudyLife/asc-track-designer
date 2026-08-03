import type { SupabaseClient } from '@supabase/supabase-js'
import { isTauriRuntime } from '../../../shared/platform/runtime'
import { workshopConfig } from './config'

async function invoke<T>(command: string, args?: Record<string, unknown>) {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
  return tauriInvoke<T>(command, args)
}

export const workshopSecureStorage = {
  getItem(key: string) {
    return invoke<string | null>('workshop_secure_get', { key })
  },
  setItem(key: string, value: string) {
    return invoke<void>('workshop_secure_set', { key, value })
  },
  removeItem(key: string) {
    return invoke<void>('workshop_secure_remove', { key })
  },
}

type CallbackStart = {
  requestId: string
  redirectUrl: string
}

export async function desktopGithubSignIn(client: SupabaseClient) {
  if (!isTauriRuntime()) throw new Error('桌面 GitHub 登录只能在 EXE 中使用')
  const callback = await invoke<CallbackStart>('start_workshop_oauth_callback')
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: callback.redirectUrl,
      skipBrowserRedirect: true,
    },
  })
  if (error) throw error
  if (!data.url) throw new Error('GitHub 登录地址无效')

  const authorizationUrl = new URL(data.url)
  const serviceUrl = new URL(workshopConfig.supabaseUrl)
  if (authorizationUrl.protocol !== 'https:' || authorizationUrl.host !== serviceUrl.host) {
    throw new Error('GitHub 登录地址未通过安全校验')
  }

  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl(authorizationUrl.toString())
  const callbackUrl = await invoke<string>('wait_for_workshop_oauth_callback', { requestId: callback.requestId })
  const result = new URL(callbackUrl)
  const providerError = result.searchParams.get('error_description') || result.searchParams.get('error')
  if (providerError) throw new Error(providerError)
  const code = result.searchParams.get('code')
  if (!code) throw new Error('GitHub 登录回调缺少授权码')

  const exchange = await client.auth.exchangeCodeForSession(code)
  if (exchange.error) throw exchange.error
}
