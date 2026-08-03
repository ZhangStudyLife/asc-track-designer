import { handleRequest, HttpError, jsonResponse } from '../_shared/http.ts'
import { requireUser, serviceClient } from '../_shared/supabase.ts'
import {
  checksumSha256,
  MAX_DOCUMENT_BYTES,
  MAX_PREVIEW_BYTES,
  trackTotalLength,
  validatePublishMetadata,
  validateTrackDocument,
} from '../_shared/track.ts'

Deno.serve((request) => handleRequest(request, async () => {
  const user = await requireUser(request)
  const form = await request.formData()
  const metadataText = form.get('metadata')
  const documentFile = form.get('document')
  const previewFile = form.get('preview')
  if (typeof metadataText !== 'string' || !(documentFile instanceof File) || !(previewFile instanceof File)) {
    throw new HttpError(400, '上传内容不完整')
  }
  if (documentFile.size > MAX_DOCUMENT_BYTES) throw new HttpError(413, '赛道 JSON 不能超过 2 MB')
  if (previewFile.size > MAX_PREVIEW_BYTES) throw new HttpError(413, '预览图不能超过 1 MB')
  if (!['image/webp', 'image/png'].includes(previewFile.type)) throw new HttpError(400, '预览图格式无效')

  let metadataSource: unknown
  let documentSource: unknown
  try {
    metadataSource = JSON.parse(metadataText)
    documentSource = JSON.parse(await documentFile.text())
  } catch {
    throw new HttpError(400, '上传 JSON 无法解析')
  }
  const metadata = validatePublishMetadata(metadataSource)
  const document = validateTrackDocument(documentSource)
  const documentBytes = new TextEncoder().encode(JSON.stringify(document))
  if (documentBytes.byteLength > MAX_DOCUMENT_BYTES) throw new HttpError(413, '赛道 JSON 不能超过 2 MB')

  const service = serviceClient()
  const objectId = crypto.randomUUID()
  const jsonPath = `${user.id}/${objectId}.json`
  const previewExtension = previewFile.type === 'image/png' ? 'png' : 'webp'
  const previewPath = `${user.id}/${objectId}.${previewExtension}`
  let jsonUploaded = false
  let previewUploaded = false

  try {
    const jsonUpload = await service.storage.from('workshop-tracks').upload(jsonPath, documentBytes, {
      contentType: 'application/json',
      upsert: false,
    })
    if (jsonUpload.error) throw jsonUpload.error
    jsonUploaded = true

    const previewUpload = await service.storage.from('workshop-previews').upload(previewPath, previewFile, {
      contentType: previewFile.type,
      cacheControl: '31536000',
      upsert: false,
    })
    if (previewUpload.error) throw previewUpload.error
    previewUploaded = true

    const { data, error } = await service.rpc('workshop_publish_track', {
      p_actor_id: user.id,
      p_track_id: metadata.trackId,
      p_title: metadata.title,
      p_description: metadata.description,
      p_tags: metadata.tags,
      p_license: metadata.license,
      p_change_note: metadata.changeNote,
      p_app_version: metadata.appVersion,
      p_json_path: jsonPath,
      p_preview_path: previewPath,
      p_checksum_sha256: await checksumSha256(documentBytes),
      p_piece_count: document.pieces.length,
      p_total_length: trackTotalLength(document),
    })
    if (error) throw error
    return jsonResponse(data?.[0] || null, 201)
  } catch (reason) {
    const removals: PromiseLike<unknown>[] = []
    if (jsonUploaded) removals.push(service.storage.from('workshop-tracks').remove([jsonPath]))
    if (previewUploaded) removals.push(service.storage.from('workshop-previews').remove([previewPath]))
    await Promise.allSettled(removals)
    throw reason
  }
}))
