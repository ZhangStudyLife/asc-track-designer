import { AUTHOR_URL, RELEASE_NOTES_PREFIX, REPOSITORY_URL } from '../appInfo'
import { isTauriRuntime } from './runtime'

const ALLOWED_EXTERNAL_URLS = new Set([REPOSITORY_URL, AUTHOR_URL])

export async function openExternalUrl(url: string) {
  if (!ALLOWED_EXTERNAL_URLS.has(url) && !url.startsWith(RELEASE_NOTES_PREFIX)) {
    throw new Error('不允许打开该外部链接')
  }

  if (isTauriRuntime()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
