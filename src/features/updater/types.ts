export type UpdateRelease = {
  version: string
  tagName: string
  title: string
  body: string
  publishedAt: string | null
  notesUrl: string
  assetName: string
  assetSize: number
}

export type DownloadProgress = {
  downloaded: number
  total: number
}

export type DownloadedUpdate = {
  path: string
  bytes: number
  sha256: string
  installable: boolean
}

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error'
