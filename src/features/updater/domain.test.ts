import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  parseVersion,
  readSkippedVersion,
  shouldShowUpdate,
  skipVersion,
} from './domain'
import type { UpdateRelease } from './types'

const release: UpdateRelease = {
  version: '2.2.0',
  tagName: 'v2.2.0',
  title: 'ASC Track Designer 2.2.0',
  body: '更新说明',
  publishedAt: null,
  notesUrl: 'https://github.com/ZhangStudyLife/asc-track-designer/releases/tag/v2.2.0',
  assetName: 'ASC.2.2.0.exe',
  assetSize: 100,
}

describe('updater version domain', () => {
  it('parses stable versions with or without a v prefix', () => {
    expect(parseVersion('v2.2.0')).toEqual({ major: 2, minor: 2, patch: 0 })
    expect(parseVersion('2.2.0')).toEqual({ major: 2, minor: 2, patch: 0 })
    expect(parseVersion('2.2')).toBeNull()
    expect(parseVersion('v2.2.0-beta')).toBeNull()
  })

  it('compares semantic versions', () => {
    expect(compareVersions('2.2.0', '2.1.0')).toBe(1)
    expect(compareVersions('2.1.9', '2.2.0')).toBe(-1)
    expect(compareVersions('v2.2.0', '2.2.0')).toBe(0)
    expect(compareVersions('latest', '2.2.0')).toBeNull()
  })

  it('stores and reads the skipped version without changing project keys', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    }

    expect(readSkippedVersion(storage)).toBeNull()
    skipVersion(release.version, storage)
    expect(readSkippedVersion(storage)).toBe('2.2.0')
    expect(values.has('currentTrackProject')).toBe(false)
  })

  it('shows higher versions again after a skipped version changes', () => {
    expect(shouldShowUpdate(release, null)).toBe(true)
    expect(shouldShowUpdate(release, '2.2.0')).toBe(false)
    expect(shouldShowUpdate(release, '2.3.0')).toBe(true)
  })
})
