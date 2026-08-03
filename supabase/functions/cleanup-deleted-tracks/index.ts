import { handleRequest, HttpError, jsonResponse } from '../_shared/http.ts'
import { serviceClient } from '../_shared/supabase.ts'

Deno.serve((request) => handleRequest(request, async () => {
  const expectedSecret = Deno.env.get('WORKSHOP_CLEANUP_SECRET')
  if (!expectedSecret || request.headers.get('x-cleanup-secret') !== expectedSecret) {
    throw new HttpError(401, 'Unauthorized')
  }

  const service = serviceClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: tracks, error } = await service
    .from('tracks')
    .select('id, track_revisions(json_path, preview_path)')
    .eq('status', 'deleted')
    .lt('deleted_at', cutoff)
    .limit(100)
  if (error) throw error

  let removed = 0
  for (const track of tracks || []) {
    const revisions = Array.isArray(track.track_revisions) ? track.track_revisions : []
    const jsonPaths = revisions.map((revision) => revision.json_path).filter(Boolean)
    const previewPaths = revisions.map((revision) => revision.preview_path).filter(Boolean)
    if (jsonPaths.length) {
      const result = await service.storage.from('workshop-tracks').remove(jsonPaths)
      if (result.error) throw result.error
    }
    if (previewPaths.length) {
      const result = await service.storage.from('workshop-previews').remove(previewPaths)
      if (result.error) throw result.error
    }
    const deletion = await service.from('tracks').delete().eq('id', track.id).eq('status', 'deleted')
    if (deletion.error) throw deletion.error
    removed += 1
  }

  return jsonResponse({ removed })
}))
