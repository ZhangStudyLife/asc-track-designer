import { handleRequest, HttpError, jsonResponse } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/supabase.ts'

Deno.serve((request) => handleRequest(request, async () => {
  const user = await requireUser(request)
  const body = await request.json().catch(() => null) as { revisionId?: unknown } | null
  if (!body || typeof body.revisionId !== 'string') throw new HttpError(400, '请选择要下载的赛道版本')

  const service = serviceClient()
  const { data, error } = await service.rpc('workshop_record_download', {
    p_actor_id: user.id,
    p_revision_id: body.revisionId,
  })
  if (error || !data?.[0]) throw error || new HttpError(404, '赛道版本不存在')

  const record = data[0]
  const signed = await service.storage.from('workshop-tracks').createSignedUrl(record.json_path, 60)
  if (signed.error) throw signed.error
  return jsonResponse({
    signedUrl: signed.data.signedUrl,
    checksumSha256: record.checksum_sha256,
    fileName: `${String(record.track_title).replace(/[<>:"/\\|?*]+/g, '_')}-r${record.revision_number}.json`,
  })
}))
