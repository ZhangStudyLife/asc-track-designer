import type { TrackPiece } from '../../pvc/domain/types'

export type WorkshopTrackMode = 'pvc'
export type WorkshopTrackLicense = 'cc-by-4.0' | 'cc-by-nc-4.0' | 'cc0-1.0' | 'all-rights-reserved'
export type WorkshopTrackSort = 'newest' | 'rating' | 'downloads' | 'likes'
export type WorkshopTrackStatus = 'published' | 'hidden' | 'deleted'
export type WorkshopNotificationType = 'like' | 'rating' | 'comment' | 'reply' | 'moderation'
export type WorkshopReportReason = 'spam' | 'abuse' | 'copyright' | 'invalid-track' | 'other'

export type PvcTrackBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type PvcTrackDocument = {
  version: '1.0'
  created: string
  bounds: PvcTrackBounds
  pieces: TrackPiece[]
}

export type WorkshopProfile = {
  id: string
  githubId: number
  githubLogin: string
  displayName: string
  avatarUrl: string
  role: 'user' | 'admin'
}

export type WorkshopTrackSummary = {
  id: string
  mode: WorkshopTrackMode
  title: string
  description: string
  tags: string[]
  license: WorkshopTrackLicense
  previewUrl: string
  pieceCount: number
  totalLength: number
  ratingAverage: number
  ratingCount: number
  likeCount: number
  commentCount: number
  downloadCount: number
  publishedAt: string
  author: WorkshopProfile
}

export type TrackRevision = {
  id: string
  trackId: string
  revision: number
  appVersion: string
  schemaVersion: '1.0'
  previewUrl: string
  pieceCount: number
  totalLength: number
  checksumSha256: string
  changeNote: string
  createdAt: string
}

export type WorkshopTrackDetail = WorkshopTrackSummary & {
  status: WorkshopTrackStatus
  currentRevision: TrackRevision
  revisions: TrackRevision[]
  viewerHasDownloaded: boolean
  viewerLiked: boolean
  viewerRating: number | null
}

export type WorkshopComment = {
  id: string
  trackId: string
  author: WorkshopProfile
  body: string
  rootId: string | null
  replyToCommentId: string | null
  replyToUser: WorkshopProfile | null
  createdAt: string
  editedAt: string | null
  replies?: WorkshopComment[]
}

export type WorkshopNotification = {
  id: string
  type: WorkshopNotificationType
  actor: WorkshopProfile | null
  trackId: string | null
  trackTitle: string | null
  commentId: string | null
  message: string
  createdAt: string
  readAt: string | null
}

export type WorkshopReport = {
  id: string
  reporter: WorkshopProfile
  targetType: 'track' | 'comment'
  targetId: string
  reason: WorkshopReportReason
  details: string
  status: 'open' | 'resolved' | 'dismissed'
  createdAt: string
}

export type TrackPublishInput = {
  trackId?: string
  title: string
  description: string
  tags: string[]
  license: WorkshopTrackLicense
  changeNote: string
  document: PvcTrackDocument
  preview: Blob
}

export type WorkshopTrackQuery = {
  query?: string
  tags?: string[]
  sort?: WorkshopTrackSort
  cursor?: string
  limit?: number
}

export type WorkshopPage<T> = {
  items: T[]
  nextCursor: string | null
}
