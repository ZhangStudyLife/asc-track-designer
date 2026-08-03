import { handleRequest, HttpError, jsonResponse } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/supabase.ts'

Deno.serve((request) => handleRequest(request, async () => {
  const user = await requireUser(request)
  const body = await request.json().catch(() => null) as { reportId?: unknown; action?: unknown } | null
  const action = String(body?.action || '')
  if (!body || typeof body.reportId !== 'string' || !['hide', 'dismiss'].includes(action)) {
    throw new HttpError(400, '管理操作无效')
  }

  const { error } = await serviceClient().rpc('workshop_moderate_content', {
    p_actor_id: user.id,
    p_report_id: body.reportId,
    p_action: action,
  })
  if (error) throw error
  return jsonResponse({ ok: true })
}))
