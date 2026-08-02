import React from 'react'
import { openExternalUrl } from '../../../shared/platform/externalLinks'
import { isTauriRuntime } from '../../../shared/platform/runtime'
import type { DownloadProgress, DownloadedUpdate, UpdateRelease, UpdaterStatus } from '../types'

type UpdateDialogProps = {
  open: boolean
  isDark: boolean
  release: UpdateRelease | null
  status: UpdaterStatus
  progress: DownloadProgress | null
  downloaded: DownloadedUpdate | null
  error: string
  onLater: () => void
  onSkip: () => void
  onStart: () => void
  onRetry: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatPublishedAt(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

export function UpdateDialog({
  open,
  isDark,
  release,
  status,
  progress,
  downloaded,
  error,
  onLater,
  onSkip,
  onStart,
  onRetry,
}: UpdateDialogProps) {
  if (!open || !release) return null

  const palette = isDark
    ? {
        overlay: 'rgba(2, 8, 23, 0.78)',
        panel: '#0f172a',
        panelSoft: '#111c30',
        border: '#334155',
        text: '#e5e7eb',
        muted: '#94a3b8',
        primary: '#38bdf8',
        primaryText: '#04111f',
        danger: '#fca5a5',
      }
    : {
        overlay: 'rgba(15, 23, 42, 0.42)',
        panel: '#ffffff',
        panelSoft: '#f8fafc',
        border: '#cbd5e1',
        text: '#111827',
        muted: '#64748b',
        primary: '#2563eb',
        primaryText: '#ffffff',
        danger: '#b91c1c',
      }
  const busy = status === 'downloading' || status === 'installing'
  const percentage = progress && progress.total > 0
    ? Math.min(100, Math.round(progress.downloaded / progress.total * 100))
    : 0

  return (
    <div
      data-testid="update-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3200,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: palette.overlay,
      }}
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onLater()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`发现新版本 ${release.version}`}
        style={{
          width: 'min(620px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          background: palette.panel,
          color: palette.text,
          boxShadow: '0 20px 60px rgba(2, 8, 23, 0.3)',
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ color: palette.primary, fontSize: 12, fontWeight: 700 }}>发现新版本</div>
          <h2 style={{ margin: '4px 0 0', fontSize: 20, lineHeight: 1.3 }}>{release.version}</h2>
          <p style={{ margin: '6px 0 0', color: palette.muted, fontSize: 12 }}>
            {release.title}{formatPublishedAt(release.publishedAt) ? ` · ${formatPublishedAt(release.publishedAt)}` : ''}
          </p>
        </header>

        <div style={{ display: 'grid', gap: 14, padding: 20 }}>
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: 13 }}>更新说明</h3>
            <div
              data-testid="update-notes"
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                padding: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 6,
                background: palette.panelSoft,
                color: palette.text,
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {release.body || '本次版本暂无详细更新说明。'}
            </div>
          </section>

          <div style={{ color: palette.muted, fontSize: 12 }}>
            更新文件：{release.assetName} · {formatBytes(release.assetSize)}
          </div>

          <a
            href={release.notesUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              if (!isTauriRuntime()) return
              event.preventDefault()
              void openExternalUrl(release.notesUrl)
            }}
            style={{ width: 'fit-content', color: palette.primary, fontSize: 12, textDecoration: 'none' }}
          >
            查看完整更新日志
          </a>

          {status === 'downloading' ? (
            <div data-testid="update-progress" style={{ display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.muted, fontSize: 12 }}>
                <span>正在下载更新</span><span>{percentage}%</span>
              </div>
              <div style={{ height: 7, overflow: 'hidden', borderRadius: 99, background: palette.border }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: palette.primary, transition: 'width 120ms linear' }} />
              </div>
              <div style={{ color: palette.muted, fontSize: 11 }}>
                {formatBytes(progress?.downloaded || 0)} / {formatBytes(progress?.total || release.assetSize)}
              </div>
            </div>
          ) : null}

          {status === 'installing' ? <div style={{ color: palette.primary, fontSize: 13 }}>正在关闭并安装新版本，请稍候…</div> : null}
          {status === 'ready' && downloaded ? <div style={{ color: palette.muted, fontSize: 12, whiteSpace: 'pre-wrap' }}>{error}</div> : null}
          {status === 'error' ? (
            <div role="alert" style={{ padding: '9px 11px', border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`, borderRadius: 6, background: isDark ? '#2a1420' : '#fef2f2', color: palette.danger, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {error}
            </div>
          ) : null}
        </div>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, padding: '12px 20px', borderTop: `1px solid ${palette.border}` }}>
          {status === 'error' ? <button type="button" aria-label="重试更新" onClick={onRetry} disabled={busy} style={{ minHeight: 34, padding: '0 12px', border: `1px solid ${palette.primary}`, borderRadius: 6, background: palette.primary, color: palette.primaryText, cursor: 'pointer', fontWeight: 600 }}>重试</button> : null}
          {status === 'available' ? <button type="button" aria-label="跳过此版本" onClick={onSkip} disabled={busy} style={{ minHeight: 34, padding: '0 12px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panelSoft, color: palette.text, cursor: 'pointer' }}>跳过此版本</button> : null}
          {!busy && status !== 'ready' ? <button type="button" aria-label="本次不更新" onClick={onLater} style={{ minHeight: 34, padding: '0 12px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panelSoft, color: palette.text, cursor: 'pointer' }}>本次不更新</button> : null}
          {status === 'available' ? <button type="button" aria-label="开始更新" onClick={onStart} style={{ minHeight: 34, padding: '0 12px', border: `1px solid ${palette.primary}`, borderRadius: 6, background: palette.primary, color: palette.primaryText, cursor: 'pointer', fontWeight: 600 }}>开始更新</button> : null}
          {status === 'ready' ? <button type="button" aria-label="关闭更新提示" onClick={onLater} style={{ minHeight: 34, padding: '0 12px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panelSoft, color: palette.text, cursor: 'pointer' }}>关闭</button> : null}
        </footer>
      </div>
    </div>
  )
}
