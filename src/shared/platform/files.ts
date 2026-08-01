import { isTauriRuntime } from './runtime'

function extensionOf(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function browserDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = fileName
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function saveBytes(fileName: string, bytes: Uint8Array, mimeType: string) {
  if (!isTauriRuntime()) {
    browserDownload(fileName, new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }))
    return true
  }

  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const extension = extensionOf(fileName)
  const destination = await save({
    defaultPath: fileName,
    filters: extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : undefined,
  })
  if (!destination) return false

  await writeFile(destination, bytes)
  return true
}

export function saveTextFile(fileName: string, contents: string) {
  return saveBytes(fileName, new TextEncoder().encode(contents), 'application/json')
}

export async function saveBlobFile(fileName: string, blob: Blob) {
  return saveBytes(fileName, new Uint8Array(await blob.arrayBuffer()), blob.type)
}

export async function openTextFile() {
  if (!isTauriRuntime()) return null

  const [{ open }, { readTextFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!selected || Array.isArray(selected)) return null

  return {
    name: selected.split(/[\\/]/).pop() || 'track.json',
    contents: await readTextFile(selected),
  }
}
