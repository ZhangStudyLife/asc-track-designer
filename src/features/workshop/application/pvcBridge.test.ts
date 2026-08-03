import { describe, expect, it } from 'vitest'
import { createPvcTrackDocument, importWorkshopTrack } from './pvcBridge'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

const pieces = [{ id: 1, type: 'straight', x: 0, y: 0, rotation: 0, params: { length: 50 } }]

describe('workshop PVC bridge', () => {
  it('builds the existing PVC export document', () => {
    const document = createPvcTrackDocument(pieces, new Date('2026-08-03T12:00:00.000Z'))
    expect(document).toMatchObject({
      version: '1.0',
      created: '2026-08-03T12:00:00.000Z',
      bounds: { x: -1600, y: -800, width: 3200, height: 1600 },
      pieces,
    })
  })

  it('archives a non-empty project before importing a workshop track', () => {
    const storage = new MemoryStorage()
    storage.setItem('currentTrackProject', JSON.stringify({
      name: '本地赛道',
      pieces: [{ ...pieces[0], id: 9 }],
      viewBox: { x: 1, y: 2, width: 3, height: 4 },
      timestamp: '2026-08-01T00:00:00.000Z',
    }))

    const document = createPvcTrackDocument(pieces, new Date('2026-08-03T12:00:00.000Z'))
    const result = importWorkshopTrack(document, '公开赛道', storage, new Date('2026-08-03T13:00:00.000Z'))

    expect(result.archiveName).toContain('工坊导入前备份')
    expect(JSON.parse(storage.getItem('trackArchives') || '[]')).toEqual([result.archiveName])
    expect(JSON.parse(storage.getItem('currentTrackProject') || '{}')).toMatchObject({
      name: '公开赛道',
      pieces,
    })
  })
})
