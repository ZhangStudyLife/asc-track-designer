import type { UpdateRelease } from './types'

export const SKIPPED_VERSION_KEY = 'ascUpdaterSkippedVersion'

type Version = {
  major: number
  minor: number
  patch: number
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/

export function parseVersion(value: string): Version | null {
  const match = VERSION_PATTERN.exec(value.trim())
  if (!match) return null

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function compareVersions(left: string, right: string) {
  const leftVersion = parseVersion(left)
  const rightVersion = parseVersion(right)
  if (!leftVersion || !rightVersion) return null

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (leftVersion[key] !== rightVersion[key]) {
      return leftVersion[key] > rightVersion[key] ? 1 : -1
    }
  }

  return 0
}

export function shouldShowUpdate(release: UpdateRelease, skippedVersion: string | null) {
  return skippedVersion !== release.version
}

export function readSkippedVersion(storage: Pick<Storage, 'getItem'> = localStorage) {
  return storage.getItem(SKIPPED_VERSION_KEY)
}

export function skipVersion(version: string, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(SKIPPED_VERSION_KEY, version)
}
