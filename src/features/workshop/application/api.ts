import type {
  PvcTrackDocument,
  TrackRevision,
  TrackPublishInput,
  WorkshopComment,
  WorkshopNotification,
  WorkshopPage,
  WorkshopProfile,
  WorkshopReport,
  WorkshopReportReason,
  WorkshopTrackDetail,
  WorkshopTrackQuery,
  WorkshopTrackSummary,
} from '../domain/types'
import { APP_VERSION } from '../../../shared/appInfo'
import { MAX_TRACK_DOCUMENT_BYTES, parsePvcTrackDocument } from '../domain/trackDocument'
import { requireWorkshopClient } from './client'

type Row = Record<string, any>

function mapProfile(row: Row): WorkshopProfile {
  return {
    id: String(row.id),
    githubId: Number(row.github_id),
    githubLogin: String(row.github_login || ''),
    displayName: String(row.display_name || row.github_login || ''),
    avatarUrl: String(row.avatar_url || ''),
    role: row.role === 'admin' ? 'admin' : 'user',
  }
}

function previewUrl(path: string) {
  return requireWorkshopClient().storage.from('workshop-previews').getPublicUrl(path).data.publicUrl
}

function mapRevision(row: Row): TrackRevision {
  return {
    id: String(row.id),
    trackId: String(row.track_id),
    revision: Number(row.revision),
    appVersion: String(row.app_version),
    schemaVersion: '1.0',
    previewUrl: previewUrl(String(row.preview_path)),
    pieceCount: Number(row.piece_count),
    totalLength: Number(row.total_length),
    checksumSha256: String(row.checksum_sha256),
    changeNote: String(row.change_note || ''),
    createdAt: String(row.created_at),
  }
}

function mapSummary(row: Row): WorkshopTrackSummary {
  const revision = Array.isArray(row.current_revision) ? row.current_revision[0] : row.current_revision
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner
  return {
    id: String(row.id),
    mode: 'pvc',
    title: String(row.title),
    description: String(row.description || ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    license: row.license,
    previewUrl: revision ? previewUrl(String(revision.preview_path)) : '',
    pieceCount: Number(revision?.piece_count || 0),
    totalLength: Number(revision?.total_length || 0),
    ratingAverage: row.rating_count ? Number(row.rating_sum) / Number(row.rating_count) : 0,
    ratingCount: Number(row.rating_count || 0),
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
    downloadCount: Number(row.download_count || 0),
    publishedAt: String(row.published_at),
    author: mapProfile(owner || {}),
  }
}

const trackSelect = `
  *,
  owner:profiles!tracks_owner_id_fkey(*),
  current_revision:track_revisions!tracks_current_revision_fk(*)
`

export async function listTracks(query: WorkshopTrackQuery = {}): Promise<WorkshopPage<WorkshopTrackSummary>> {
  const client = requireWorkshopClient()
  const limit = Math.min(Math.max(query.limit || 24, 1), 48)
  let request = client.from('tracks').select(trackSelect).eq('status', 'published').limit(limit + 1)

  const search = query.query?.trim()
  if (search) request = request.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  if (query.tags?.length) request = request.contains('tags', query.tags)
  if (query.cursor) request = request.lt('published_at', query.cursor)

  const sortColumn = query.sort === 'rating'
    ? 'rating_average'
    : query.sort === 'downloads'
      ? 'download_count'
      : query.sort === 'likes'
        ? 'like_count'
        : 'published_at'
  request = request.order(sortColumn, { ascending: false }).order('id', { ascending: false })

  const { data, error } = await request
  if (error) throw error
  const rows = data || []
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(mapSummary)
  return { items, nextCursor: hasMore ? items[items.length - 1]?.publishedAt || null : null }
}

export async function getTrack(trackId: string): Promise<WorkshopTrackDetail> {
  const client = requireWorkshopClient()
  const { data: session } = await client.auth.getSession()
  const viewerId = session.session?.user.id
  const emptyResult = Promise.resolve({ data: null, error: null })
  const [
    { data: track, error },
    { data: revisions, error: revisionsError },
    { data: like },
    { data: rating },
    { data: download },
  ] = await Promise.all([
    client.from('tracks').select(trackSelect).eq('id', trackId).single(),
    client.from('track_revisions').select('*').eq('track_id', trackId).order('revision', { ascending: false }),
    viewerId ? client.from('likes').select('track_id').eq('track_id', trackId).eq('user_id', viewerId).maybeSingle() : emptyResult,
    viewerId ? client.from('ratings').select('value').eq('track_id', trackId).eq('user_id', viewerId).maybeSingle() : emptyResult,
    viewerId ? client.from('downloads').select('track_id').eq('track_id', trackId).eq('user_id', viewerId).maybeSingle() : emptyResult,
  ])
  if (error) throw error
  if (revisionsError) throw revisionsError
  const summary = mapSummary(track)
  const mappedRevisions = (revisions || []).map(mapRevision)
  const currentRevision = mappedRevisions.find((item) => item.id === track.current_revision_id) || mappedRevisions[0]
  if (!currentRevision) throw new Error('赛道没有可用修订')
  return {
    ...summary,
    status: track.status,
    currentRevision,
    revisions: mappedRevisions,
    viewerHasDownloaded: Boolean(download),
    viewerLiked: Boolean(like),
    viewerRating: rating ? Number(rating.value) : null,
  }
}

export async function listComments(trackId: string): Promise<WorkshopComment[]> {
  const client = requireWorkshopClient()
  const { data, error } = await client
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(*), reply_to_user:profiles!comments_reply_to_user_id_fkey(*)')
    .eq('track_id', trackId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
  if (error) throw error

  const mapped = (data || []).map((row: Row): WorkshopComment => ({
    id: String(row.id),
    trackId: String(row.track_id),
    author: mapProfile(Array.isArray(row.author) ? row.author[0] : row.author),
    body: String(row.body),
    rootId: row.root_id ? String(row.root_id) : null,
    replyToCommentId: row.reply_to_comment_id ? String(row.reply_to_comment_id) : null,
    replyToUser: row.reply_to_user ? mapProfile(Array.isArray(row.reply_to_user) ? row.reply_to_user[0] : row.reply_to_user) : null,
    createdAt: String(row.created_at),
    editedAt: row.edited_at ? String(row.edited_at) : null,
  }))
  const roots = mapped.filter((comment) => !comment.rootId)
  return roots.map((root) => ({ ...root, replies: mapped.filter((comment) => comment.rootId === root.id) }))
}

export async function listNotifications(): Promise<WorkshopNotification[]> {
  const client = requireWorkshopClient()
  const { data, error } = await client
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(*), track:tracks(title)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []).map((row: Row) => ({
    id: String(row.id),
    type: row.type,
    actor: row.actor ? mapProfile(Array.isArray(row.actor) ? row.actor[0] : row.actor) : null,
    trackId: row.track_id ? String(row.track_id) : null,
    trackTitle: row.track?.title || null,
    commentId: row.comment_id ? String(row.comment_id) : null,
    message: String(row.message),
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null,
  }))
}

export async function setLike(trackId: string, liked: boolean, userId: string) {
  const client = requireWorkshopClient()
  const request = liked
    ? client.from('likes').upsert(
      { track_id: trackId, user_id: userId },
      { onConflict: 'track_id,user_id', ignoreDuplicates: true },
    )
    : client.from('likes').delete().eq('track_id', trackId).eq('user_id', userId)
  const { error } = await request
  if (error) throw error
}

export async function setRating(trackId: string, value: number, userId: string) {
  const client = requireWorkshopClient()
  const existing = await client.from('ratings').select('value').eq('track_id', trackId).eq('user_id', userId).maybeSingle()
  if (existing.error) throw existing.error
  const request = existing.data
    ? client.from('ratings').update({ value }).eq('track_id', trackId).eq('user_id', userId)
    : client.from('ratings').insert({ track_id: trackId, user_id: userId, value })
  const { error } = await request
  if (error) throw error
}

export async function createComment(input: {
  trackId: string
  authorId: string
  body: string
  rootId?: string
  replyToCommentId?: string
  replyToUserId?: string
}) {
  const { error } = await requireWorkshopClient().from('comments').insert({
    track_id: input.trackId,
    author_id: input.authorId,
    body: input.body,
    root_id: input.rootId || null,
    reply_to_comment_id: input.replyToCommentId || null,
    reply_to_user_id: input.replyToUserId || null,
  })
  if (error) throw error
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return
  const { error } = await requireWorkshopClient()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

async function edgeFunctionError(error: any) {
  try {
    const body = await error?.context?.json()
    if (typeof body?.error === 'string') return new Error(body.error)
  } catch {
    // Keep the original network error when the response body is unavailable.
  }
  return error instanceof Error ? error : new Error('创意工坊请求失败')
}

export async function publishTrack(input: TrackPublishInput) {
  const form = new FormData()
  form.set('metadata', JSON.stringify({
    trackId: input.trackId || null,
    title: input.title,
    description: input.description,
    tags: input.tags,
    license: input.license,
    changeNote: input.changeNote,
    appVersion: APP_VERSION,
  }))
  form.set('document', new File([JSON.stringify(input.document)], 'track.json', { type: 'application/json' }))
  form.set('preview', new File([input.preview], input.preview.type === 'image/png' ? 'preview.png' : 'preview.webp', {
    type: input.preview.type,
  }))

  const { data, error } = await requireWorkshopClient().functions.invoke('publish-track', { body: form })
  if (error) throw await edgeFunctionError(error)
  return data as { track_id: string; revision_id: string; revision_number: number }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function downloadRevision(revisionId: string): Promise<{ document: PvcTrackDocument; fileName: string }> {
  const { data, error } = await requireWorkshopClient().functions.invoke('download-track', {
    body: { revisionId },
  })
  if (error) throw await edgeFunctionError(error)
  if (!data?.signedUrl || !data?.checksumSha256) throw new Error('下载地址无效')

  const response = await fetch(String(data.signedUrl), { cache: 'no-store' })
  if (!response.ok) throw new Error(`赛道下载失败 (${response.status})`)
  const text = await response.text()
  if (new TextEncoder().encode(text).byteLength > MAX_TRACK_DOCUMENT_BYTES) {
    throw new Error('下载的赛道文件超过 2 MB')
  }
  if (await sha256(text) !== data.checksumSha256) throw new Error('下载文件校验失败，请重新下载')

  const parsed = parsePvcTrackDocument(text)
  if (parsed.valid === false) throw new Error(parsed.error)
  return { document: parsed.document, fileName: String(data.fileName || 'workshop-track.json') }
}

export async function listMyTracks(userId: string) {
  const { data, error } = await requireWorkshopClient()
    .from('tracks')
    .select(trackSelect)
    .eq('owner_id', userId)
    .neq('status', 'deleted')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapSummary)
}

export async function deleteTrack(trackId: string, userId: string) {
  const { error } = await requireWorkshopClient()
    .from('tracks')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', trackId)
    .eq('owner_id', userId)
  if (error) throw error
}

export async function createReport(input: {
  reporterId: string
  targetType: 'track' | 'comment'
  targetId: string
  reason: WorkshopReportReason
  details: string
}) {
  const { error } = await requireWorkshopClient().from('reports').insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details,
  })
  if (error) throw error
}

export async function listReports(): Promise<WorkshopReport[]> {
  const { data, error } = await requireWorkshopClient()
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((row: Row) => ({
    id: String(row.id),
    reporter: mapProfile(Array.isArray(row.reporter) ? row.reporter[0] : row.reporter),
    targetType: row.target_type === 'comment' ? 'comment' : 'track',
    targetId: String(row.target_id),
    reason: row.reason,
    details: String(row.details || ''),
    status: row.status,
    createdAt: String(row.created_at),
  }))
}

export async function moderateReport(reportId: string, action: 'hide' | 'dismiss') {
  const { error } = await requireWorkshopClient().functions.invoke('moderate-content', {
    body: { reportId, action },
  })
  if (error) throw await edgeFunctionError(error)
}
