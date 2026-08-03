import React from 'react'
import { FileJson, Upload, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useWorkshopAuth } from '../../application/auth'
import { deleteTrack, listMyTracks, publishTrack } from '../../application/api'
import { createPvcTrackDocument, createPvcTrackPreview, currentTrackSummary } from '../../application/pvcBridge'
import type { WorkshopTrackLicense, WorkshopTrackSummary } from '../../domain/types'
import { AuthButton, formatWorkshopDate, QueryState, WorkshopLayout } from '../components/WorkshopCommon'

type PublishTarget = WorkshopTrackSummary | null

function PublishDialog({ target, onClose }: { target: PublishTarget; onClose: () => void }) {
  const navigate = useNavigate()
  const cache = useQueryClient()
  const [title, setTitle] = React.useState(target?.title || '')
  const [description, setDescription] = React.useState(target?.description || '')
  const [tags, setTags] = React.useState(target?.tags.join(', ') || '')
  const [license, setLicense] = React.useState<WorkshopTrackLicense>(target?.license || 'cc-by-nc-4.0')
  const [changeNote, setChangeNote] = React.useState('')
  const [previewUrl, setPreviewUrl] = React.useState('')
  const [preparationError, setPreparationError] = React.useState('')
  const prepared = React.useRef<Awaited<ReturnType<typeof createPvcTrackPreview>> | null>(null)
  const [document] = React.useState(() => {
    try {
      return createPvcTrackDocument()
    } catch {
      return null
    }
  })

  React.useEffect(() => {
    if (!document) setPreparationError('当前编辑器中没有可发布的 PVC 赛道')
  }, [document])

  React.useEffect(() => {
    if (!document) return undefined
    let active = true
    void createPvcTrackPreview(document).then((preview) => {
      if (!active) return
      prepared.current = preview
      setPreviewUrl(URL.createObjectURL(preview))
    }).catch((reason) => {
      if (active) setPreparationError(reason instanceof Error ? reason.message : '预览图生成失败')
    })
    return () => {
      active = false
    }
  }, [document])

  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!document || !prepared.current) throw new Error(preparationError || '赛道预览尚未生成')
      const normalizedTags = [...new Set(tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]
      if (normalizedTags.length > 5) throw new Error('最多填写 5 个标签')
      return publishTrack({
        trackId: target?.id,
        title: title.trim(),
        description: description.trim(),
        tags: normalizedTags,
        license,
        changeNote: changeNote.trim(),
        document,
        preview: prepared.current,
      })
    },
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: ['workshop-tracks'] })
      void cache.invalidateQueries({ queryKey: ['workshop-my-tracks'] })
      onClose()
      navigate(`/workshop/tracks/${result.track_id}`)
    },
  })
  const summary = document ? currentTrackSummary(document) : null

  return (
    <div className="workshop-modal-backdrop" role="presentation">
      <section className="workshop-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
        <header>
          <div><p className="workshop-eyebrow">{target ? 'NEW REVISION' : 'PUBLISH TRACK'}</p><h2 id="publish-title">{target ? '发布新版本' : '发布当前赛道'}</h2></div>
          <button type="button" className="workshop-icon-button" onClick={onClose} aria-label="关闭"><X /></button>
        </header>
        <div className="workshop-publish-grid">
          <div className="workshop-publish-preview">
            {previewUrl ? <img src={previewUrl} alt="当前赛道发布预览" /> : <FileJson />}
            {summary ? <span>{summary.pieceCount} 件 · {summary.totalLength.toFixed(2)} m</span> : null}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>
            <label>标题<input maxLength={80} required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>描述<textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="弯道, 练习, 高速" /></label>
            <label>作品许可<select value={license} onChange={(event) => setLicense(event.target.value as WorkshopTrackLicense)}><option value="cc-by-4.0">CC BY 4.0</option><option value="cc-by-nc-4.0">CC BY-NC 4.0</option><option value="cc0-1.0">CC0</option><option value="all-rights-reserved">保留所有权利</option></select></label>
            <label>版本说明<textarea maxLength={1000} value={changeNote} onChange={(event) => setChangeNote(event.target.value)} placeholder="本次调整了哪些部分" /></label>
            {(preparationError || mutation.error) ? <p className="workshop-form-error">{preparationError || (mutation.error as Error).message}</p> : null}
            <button className="workshop-primary-button" type="submit" disabled={!title.trim() || !prepared.current || mutation.isPending}>{mutation.isPending ? '正在发布...' : '确认发布'}</button>
          </form>
        </div>
      </section>
    </div>
  )
}

export function MinePage() {
  const auth = useWorkshopAuth()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [target, setTarget] = React.useState<PublishTarget>(null)
  const tracks = useQuery({
    queryKey: ['workshop-my-tracks', auth.user?.id],
    queryFn: () => listMyTracks(auth.user!.id),
    enabled: Boolean(auth.user),
  })
  const cache = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: (trackId: string) => deleteTrack(trackId, auth.user!.id),
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ['workshop-my-tracks'] })
      void cache.invalidateQueries({ queryKey: ['workshop-tracks'] })
    },
  })

  if (!auth.user) return <WorkshopLayout><div className="workshop-gated"><Upload /><h2>登录后发布赛道</h2><AuthButton /></div></WorkshopLayout>
  return (
    <WorkshopLayout>
      <header className="workshop-content-header">
        <div><p className="workshop-eyebrow">MY TRACKS</p><h2>我的上传</h2><p>从当前编辑器赛道发布新作品，或为已有作品建立不可变修订。</p></div>
        <button className="workshop-primary-button" type="button" onClick={() => { setTarget(null); setDialogOpen(true) }}><Upload size={17} />发布当前赛道</button>
      </header>
      <QueryState loading={tracks.isLoading} error={tracks.error as Error | null} empty={!tracks.data?.length}>
        <div className="workshop-mine-list">
          {tracks.data?.map((track) => (
            <article key={track.id}>
              <div>{track.previewUrl ? <img src={track.previewUrl} alt={`${track.title} 预览`} /> : <FileJson />}</div>
              <section><h3>{track.title}</h3><p>{track.description || '暂无作品说明'}</p><span>更新于 {formatWorkshopDate(track.publishedAt)} · {track.pieceCount} 件</span></section>
              <div className="workshop-mine-actions"><button type="button" onClick={() => { setTarget(track); setDialogOpen(true) }}>发布新版本</button><button className="is-danger" type="button" disabled={deleteMutation.isPending} onClick={() => { if (confirm(`确定删除“${track.title}”吗？30 天后将永久清理。`)) deleteMutation.mutate(track.id) }}>删除</button></div>
            </article>
          ))}
        </div>
      </QueryState>
      {deleteMutation.error ? <p className="workshop-form-error">{(deleteMutation.error as Error).message}</p> : null}
      {dialogOpen ? <PublishDialog target={target} onClose={() => setDialogOpen(false)} /> : null}
    </WorkshopLayout>
  )
}
