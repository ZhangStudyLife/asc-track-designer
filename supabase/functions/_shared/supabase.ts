import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.111.0'
import { HttpError } from './http.ts'

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is unavailable`)
  return value
}

export function serviceClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, '请先登录 GitHub 账号')

  const client = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new HttpError(401, '登录状态已失效，请重新登录')
  return data.user
}
