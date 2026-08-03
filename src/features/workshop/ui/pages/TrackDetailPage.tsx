import React from 'react'
import {
  Download,
  FileJson,
  Flag,
  Heart,
  MessageSquare,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkshopAuth } from '../../application/auth'
import {
  createComment,
  createReport,
  downloadRevision,
  getTrack,
  listComments,
  setLike,
  setRating,
} from '../../application/api'
import { importWorkshopTrack, saveWorkshopTrackJson } from '../../application/pvcBridge'
import type { WorkshopComment, WorkshopReportReason } from '../../domain/types'
import { AuthButton, formatWorkshopDate, QueryState, WorkshopLayout } from '../components/WorkshopCommon'

type ReportTarget = { type: 'track' | 'comment'; id: string } | null

function ReportDialog({ target, onClose }: { target: NonNullable<ReportTarget>; onClose: () => void }) {
  const auth = useWorkshopAuth()
  const [reason, setReason] = React.useState<WorkshopReportReason>('spam')
  const [details, setDetails] = React.useState('')
  const mutation = useMutation({
    mutationFn: () => createReport({
      reporterId: auth.user!.id,
      targetType: target.type,
      targetId: target.id,
      reason,
      details: details.trim(),
    }),
    onSuccess: onClose,
  })

  return (
    <div className="workshop-modal-backdrop" role="presentation">
      <form className="workshop-report-dialog" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
        <header><h3>举报公开内容</h3><button type="button" className="workshop-icon-button" onClick={onClose} aria-label="关闭"><X /></button></header>
        <label>原因<select value={reason} onChange={(event) => setReason(event.target.value as WorkshopReportReason)}><option value="spam">垃圾或广告</option><option value="abuse">不当内容</option><option value="copyright">版权问题</option><option value="invalid-track">无效赛道</option><option value="other">其他</option></select></label>
        <label>补充说明<textarea maxLength={1000} value={details} onChange={(event) => setDetails(event.target.value)} /></label>
        {mutation.error ? <p className="workshop-form-error">{(mutation.error as Error).message}</p> : null}
        <button className="workshop-primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? '正在提交...' : '提交举报'}</button>
      </form>
    </div>
  )
}

function CommentThread({ comment, onReply, onReport, canInteract }: {
  comment: WorkshopComment
  onReply: (root: WorkshopComment, target: WorkshopComment) => void
  onReport: (comment: WorkshopComment) => void
  canInteract: boolean
}) {
  const actions = (root: WorkshopComment, target: WorkshopComment) => canInteract ? (
    <span className="workshop-comment-actions">
      <button type="button" onClick={() => onReply(root, target)}>回复</button>
      <button type="button" onClick={() => onReport(target)}>举报</button>
    </span>
  ) : null

  return (
    <article className="workshop-comment">
      <div>{comment.author.avatarUrl ? <img src={comment.author.avatarUrl} alt="" /> : <UserRound />}</div>
      <div>
        <header><strong>{comment.author.displayName}</strong><time>{formatWorkshopDate(comment.createdAt)}</time></header>
        <p>{comment.body}</p>
        {actions(comment, comment)}
        {comment.replies?.length ? (
          <div className="workshop-replies">
            {comment.replies.map((reply) => (
              <div key={reply.id}>
                <strong>{reply.author.displayName}</strong>
                {reply.replyToUser ? <span> 回复 @{reply.replyToUser.githubLogin}</span> : null}
                <p>{reply.body}</p>
                {actions(comment, reply)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function TrackDetailPage() {
  const { trackId = '' } = useParams()
  const navigate = useNavigate()
  const auth = useWorkshopAuth()
  const cache = useQueryClient()
  const [comment, setComment] = React.useState('')
  const [reply, setReply] = React.useState<{ root: WorkshopComment; target: WorkshopComment } | null>(null)
  const [reportTarget, setReportTarget] = React.useState<ReportTarget>(null)
  const [actionMessage, setActionMessage] = React.useState('')

  const track = useQuery({ queryKey: ['workshop-track', trackId], queryFn: () => getTrack(trackId), enabled: Boolean(trackId) })
  const comments = useQuery({ queryKey: ['workshop-comments', trackId], queryFn: () => listComments(trackId), enabled: Boolean(trackId) })
  const refreshTrack = () => void cache.invalidateQueries({ queryKey: ['workshop-track', trackId] })
  const likeMutation = useMutation({ mutationFn: (liked: boolean) => setLike(trackId, liked, auth.user!.id), onSuccess: refreshTrack })
  const ratingMutation = useMutation({ mutationFn: (value: number) => setRating(trackId, value, auth.user!.id), onSuccess: refreshTrack })
  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment({ trackId, authorId: auth.user!.id, body }),
    onSuccess: () => {
      refreshTrack()
      void cache.invalidateQueries({ queryKey: ['workshop-comments', trackId] })
    },
  })
  const replyMutation = useMutation({
    mutationFn: (body: string) => createComment({
      trackId,
      authorId: auth.user!.id,
      body,
      rootId: reply!.root.id,
      replyToCommentId: reply!.target.id,
      replyToUserId: reply!.target.author.id,
    }),
    onSuccess: () => {
      setReply(null)
      refreshTrack()
      void cache.invalidateQueries({ queryKey: ['workshop-comments', trackId] })
    },
  })
  const downloadMutation = useMutation({
    mutationFn: async ({ revisionId, mode }: { revisionId: string; mode: 'import' | 'save' }) => {
      const downloaded = await downloadRevision(revisionId)
      if (mode === 'save') {
        const saved = await saveWorkshopTrackJson(downloaded.document, track.data?.title || downloaded.fileName)
        if (!saved) return
        setActionMessage('赛道 JSON 已保存')
        return
      }
      const result = importWorkshopTrack(downloaded.document, track.data?.title || '工坊赛道')
      setActionMessage(result.archiveName ? `已备份当前项目到“${result.archiveName}”` : '')
      navigate('/editor')
    },
    onSuccess: refreshTrack,
  })

  const interactionError = likeMutation.error || ratingMutation.error || commentMutation.error || replyMutation.error || downloadMutation.error

  return (
    <WorkshopLayout>
      <button className="workshop-back" type="button" onClick={() => navigate('/workshop')}>返回工坊</button>
      <QueryState loading={track.isLoading} error={track.error as Error | null}>
        {track.data ? (
          <>
            <article className="workshop-detail">
              <div className="workshop-detail-preview">{track.data.previewUrl ? <img src={track.data.previewUrl} alt={`${track.data.title} 赛道预览`} /> : <FileJson />}</div>
              <div className="workshop-detail-info">
                <p className="workshop-eyebrow">PVC TRACK · REV {track.data.currentRevision.revision}</p>
                <h2>{track.data.title}</h2>
                <p>{track.data.description || '作者没有填写作品说明。'}</p>
                <div className="workshop-detail-author">{track.data.author.avatarUrl ? <img src={track.data.author.avatarUrl} alt="" /> : <UserRound />}<div><strong>{track.data.author.displayName}</strong><span>@{track.data.author.githubLogin}</span></div></div>
                <div className="workshop-detail-metrics"><span><Star />{track.data.ratingAverage.toFixed(1)} / 5</span><span><Download />{track.data.downloadCount}</span><span><Heart />{track.data.likeCount}</span><span><MessageSquare />{track.data.commentCount}</span></div>
                <div className="workshop-action-row">
                  <button type="button" className="workshop-primary-button" disabled={!auth.user || downloadMutation.isPending} onClick={() => downloadMutation.mutate({ revisionId: track.data!.currentRevision.id, mode: 'import' })}><Download size={17} />导入编辑器</button>
                  <button type="button" disabled={!auth.user || downloadMutation.isPending} onClick={() => downloadMutation.mutate({ revisionId: track.data!.currentRevision.id, mode: 'save' })}><FileJson size={17} />另存 JSON</button>
                  <button type="button" disabled={!auth.user || likeMutation.isPending} onClick={() => likeMutation.mutate(!track.data!.viewerLiked)}><Heart size={17} fill={track.data.viewerLiked ? 'currentColor' : 'none'} />{track.data.viewerLiked ? '已点赞' : '点赞'}</button>
                  <button type="button" disabled={!auth.user} onClick={() => setReportTarget({ type: 'track', id: trackId })}><Flag size={17} />举报</button>
                </div>
                {!auth.user ? <p className="workshop-auth-hint">登录后可以下载、点赞和评分。</p> : null}
                <div className="workshop-rating" aria-label="赛道评分">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" disabled={!auth.user || !track.data!.viewerHasDownloaded} onClick={() => ratingMutation.mutate(value)} aria-label={`评分 ${value} 星`}><Star fill={value <= (track.data!.viewerRating || 0) ? 'currentColor' : 'none'} /></button>)}</div>
                {auth.user && !track.data.viewerHasDownloaded ? <p className="workshop-auth-hint">下载一次该赛道后即可评分。</p> : null}
                {actionMessage ? <p className="workshop-success-message">{actionMessage}</p> : null}
                {interactionError ? <p className="workshop-form-error">{(interactionError as Error).message}</p> : null}
              </div>
            </article>
            <section className="workshop-revision-history">
              <header><h3>版本历史</h3><span>{track.data.revisions.length} 个修订</span></header>
              {track.data.revisions.map((revision) => (
                <div key={revision.id}><div><strong>r{revision.revision}</strong><span>{formatWorkshopDate(revision.createdAt)} · v{revision.appVersion}</span><p>{revision.changeNote || '未填写版本说明'}</p></div><button type="button" disabled={!auth.user || downloadMutation.isPending} onClick={() => downloadMutation.mutate({ revisionId: revision.id, mode: 'save' })}><Download size={15} />下载</button></div>
              ))}
            </section>
            <section className="workshop-comments">
              <header><h3>评价与讨论</h3><span>{track.data.commentCount} 条</span></header>
              {auth.user ? <form onSubmit={(event) => { event.preventDefault(); const body = comment.trim(); if (!body) return; commentMutation.mutate(body); setComment('') }}><textarea maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="分享你对这条赛道的看法" /><button type="submit" disabled={!comment.trim() || commentMutation.isPending}>发表评论</button></form> : <div className="workshop-comment-login"><AuthButton /></div>}
              {reply ? <form className="workshop-reply-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const body = String(form.get('reply') || '').trim(); if (body) replyMutation.mutate(body) }}><label>回复 @{reply.target.author.githubLogin}<textarea name="reply" maxLength={1000} autoFocus /></label><div><button type="button" onClick={() => setReply(null)}>取消</button><button type="submit" disabled={replyMutation.isPending}>发送回复</button></div></form> : null}
              <QueryState loading={comments.isLoading} error={comments.error as Error | null} empty={!comments.data?.length}><div className="workshop-comment-list">{comments.data?.map((item) => <CommentThread key={item.id} comment={item} canInteract={Boolean(auth.user)} onReply={(root, target) => setReply({ root, target })} onReport={(target) => setReportTarget({ type: 'comment', id: target.id })} />)}</div></QueryState>
            </section>
          </>
        ) : null}
      </QueryState>
      {reportTarget ? <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} /> : null}
    </WorkshopLayout>
  )
}
