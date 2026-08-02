import React from 'react'
import {
  readSkippedVersion,
  shouldShowUpdate,
  skipVersion,
} from '../domain'
import {
  checkForUpdate,
  downloadUpdate,
  installUpdate,
  supportsDesktopUpdater,
} from '../../../shared/platform/updater'
import type {
  DownloadProgress,
  DownloadedUpdate,
  UpdateRelease,
  UpdaterStatus,
} from '../types'

type UseUpdaterOptions = {
  onBeforeInstall: () => boolean | Promise<boolean>
  onStatusMessage: (message: string, duration?: number) => void
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '更新操作失败，请稍后重试。'
}

export function useUpdater({ onBeforeInstall, onStatusMessage }: UseUpdaterOptions) {
  const [release, setRelease] = React.useState<UpdateRelease | null>(null)
  const [status, setStatus] = React.useState<UpdaterStatus>('idle')
  const [progress, setProgress] = React.useState<DownloadProgress | null>(null)
  const [downloaded, setDownloaded] = React.useState<DownloadedUpdate | null>(null)
  const [error, setError] = React.useState('')
  const [checkMessage, setCheckMessage] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const checkNow = React.useCallback(async (manual = false) => {
    if (!supportsDesktopUpdater()) {
      const message = '网页版会随在线部署自动更新'
      setCheckMessage(message)
      if (manual) onStatusMessage(message, 1800)
      return null
    }

    setStatus('checking')
    setError('')
    setCheckMessage('正在检查更新…')

    try {
      const candidate = await checkForUpdate()
      const skippedVersion = readSkippedVersion()
      if (candidate && (manual || shouldShowUpdate(candidate, skippedVersion))) {
        setRelease(candidate)
        setStatus('available')
        setCheckMessage(`发现新版本 ${candidate.version}`)
        setDialogOpen(manual)
        return candidate
      }

      setRelease(null)
      setStatus('idle')
      setDialogOpen(false)
      setCheckMessage('当前已是最新版本')
      if (manual) onStatusMessage('当前已是最新版本', 1800)
      return null
    } catch (checkError) {
      const message = errorMessage(checkError)
      setStatus('error')
      setError(message)
      setCheckMessage(`检查失败：${message}`)
      if (manual) onStatusMessage(`检查更新失败：${message}`, 5000)
      return null
    }
  }, [onStatusMessage])

  React.useEffect(() => {
    if (!supportsDesktopUpdater()) return undefined
    const timer = setTimeout(() => {
      void checkNow()
    }, 20_000)
    return () => clearTimeout(timer)
  }, [checkNow])

  const showUpdate = React.useCallback(() => {
    if (release) setDialogOpen(true)
  }, [release])

  const later = React.useCallback(() => {
    if (status === 'downloading' || status === 'installing') return
    setDialogOpen(false)
  }, [status])

  const skip = React.useCallback(() => {
    if (!release || status === 'downloading' || status === 'installing') return
    skipVersion(release.version)
    setDialogOpen(false)
    setRelease(null)
    setStatus('idle')
  }, [release, status])

  const start = React.useCallback(async () => {
    if (!release || status === 'downloading' || status === 'installing') return

    setError('')
    setDownloaded(null)
    setProgress(null)

    try {
      if (!(await onBeforeInstall())) {
        throw new Error('当前赛道保存失败，已取消更新。')
      }

      setStatus('downloading')
      const result = await downloadUpdate(release.version, setProgress)
      setDownloaded(result)

      if (!result.installable) {
        setStatus('ready')
        setError(`更新文件已下载到：${result.path}\n当前程序目录没有写入权限，请手动替换旧版 EXE。`)
        return
      }

      setStatus('installing')
      await installUpdate(result.path)
    } catch (updateError) {
      setStatus('error')
      setError(errorMessage(updateError))
    }
  }, [onBeforeInstall, release, status])

  const retry = React.useCallback(() => {
    void start()
  }, [start])

  return {
    release,
    status,
    progress,
    downloaded,
    error,
    checkMessage,
    dialogOpen,
    checkNow,
    showUpdate,
    later,
    skip,
    start,
    retry,
  }
}
