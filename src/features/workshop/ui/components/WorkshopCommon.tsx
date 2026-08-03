import React from 'react'
import {
  Bell,
  Download,
  FileJson,
  Github,
  Heart,
  LoaderCircle,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Upload,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWorkshopAuth } from '../../application/auth'
import type { WorkshopTrackSummary } from '../../domain/types'

export function formatWorkshopDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatTrackLength(value: number) {
  return `${value.toFixed(2)} m`
}

export function AuthButton() {
  const auth = useWorkshopAuth()
  const [error, setError] = React.useState('')

  if (auth.profile) {
    return (
      <div className="workshop-user">
        {auth.profile.avatarUrl ? <img src={auth.profile.avatarUrl} alt="" /> : <UserRound size={18} />}
        <span>{auth.profile.displayName}</span>
        <button type="button" onClick={() => void auth.signOut()}>退出</button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        className="workshop-primary-button"
        disabled={auth.status === 'loading' || auth.status === 'unconfigured'}
        onClick={() => void auth.signIn().catch((reason) => {
          setError(reason instanceof Error ? reason.message : '登录失败')
        })}
      >
        <Github size={17} />
        {auth.status === 'loading' ? '检查账号...' : '使用 GitHub 登录'}
      </button>
      {auth.status === 'unconfigured' ? <span className="workshop-inline-error">创意工坊服务尚未配置。</span> : null}
      {error ? <span className="workshop-inline-error">{error}</span> : null}
    </div>
  )
}

export function WorkshopLayout({ children }: { children: React.ReactNode }) {
  const auth = useWorkshopAuth()
  return (
    <div className="workshop-page">
      <aside className="workshop-sidebar">
        <div>
          <p className="workshop-eyebrow">ASC COMMUNITY</p>
          <h1>赛道创意工坊</h1>
        </div>
        <nav aria-label="创意工坊导航">
          <Link to="/workshop"><Search size={17} />发现赛道</Link>
          <Link to="/workshop/mine"><Upload size={17} />我的上传</Link>
          <Link to="/notifications"><Bell size={17} />互动消息</Link>
          {auth.profile?.role === 'admin' ? <Link to="/admin/reports"><ShieldCheck size={17} />举报管理</Link> : null}
        </nav>
        <div className="workshop-sidebar-account">
          <AuthButton />
          <p>公开浏览无需登录，下载和互动需要 GitHub 账号。</p>
        </div>
      </aside>
      <section className="workshop-main">{children}</section>
    </div>
  )
}

export function QueryState({ loading, error, empty, children }: {
  loading: boolean
  error: Error | null
  empty?: boolean
  children: React.ReactNode
}) {
  if (loading) return <div className="workshop-state"><LoaderCircle className="is-spinning" />正在加载社区内容...</div>
  if (error) return (
    <div className="workshop-state is-error">
      <Settings />
      <strong>创意工坊暂时不可用</strong>
      <span>{error.message}</span>
      <small>本地赛道编辑器不受影响。</small>
    </div>
  )
  if (empty) return <div className="workshop-state">还没有符合条件的公开赛道。</div>
  return <>{children}</>
}

export function TrackCard({ track }: { track: WorkshopTrackSummary }) {
  return (
    <Link className="workshop-track-card" to={`/workshop/tracks/${track.id}`}>
      <div className="workshop-card-preview">
        {track.previewUrl
          ? <img src={track.previewUrl} alt={`${track.title} 赛道预览`} loading="lazy" />
          : <div className="workshop-preview-placeholder"><FileJson /></div>}
        <span>{track.mode.toUpperCase()}</span>
      </div>
      <div className="workshop-card-body">
        <h2>{track.title}</h2>
        <div className="workshop-author-line">
          {track.author.avatarUrl ? <img src={track.author.avatarUrl} alt="" /> : <UserRound size={16} />}
          <span>{track.author.displayName}</span>
          <time>{formatWorkshopDate(track.publishedAt)}</time>
        </div>
        <div className="workshop-tags">{track.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="workshop-card-stats">
          <span><Star size={14} fill="currentColor" />{track.ratingAverage ? track.ratingAverage.toFixed(1) : '暂无'}</span>
          <span><Download size={14} />{track.downloadCount}</span>
          <span><Heart size={14} />{track.likeCount}</span>
          <span>{track.pieceCount} 件 · {formatTrackLength(track.totalLength)}</span>
        </div>
      </div>
    </Link>
  )
}
