import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PVC_EDITOR_SETTINGS,
  formatShortcut,
  getThemeColors,
  keyboardEventToBinding,
  readEditorSettings,
  shortcutMatchesEvent,
  validateEditorSettings,
  writeEditorSettings,
  type PvcEditorSettings,
  type ShortcutBinding,
} from './editorSettings'
import { TRACK_STORAGE_KEYS } from './storage'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const binding = (code: string, modifiers: Partial<Omit<ShortcutBinding, 'code'>> = {}): ShortcutBinding => ({
  code,
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
  ...modifiers,
})

const keyboardEvent = (code: string, modifiers: Partial<{
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}> = {}) => ({
  code,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...modifiers,
})

describe('PVC editor settings', () => {
  it('provides the current editor defaults', () => {
    expect(DEFAULT_PVC_EDITOR_SETTINGS).toEqual({
      version: 1,
      rotateLeft: binding('Tab'),
      rotateRight: binding('Tab', { shift: true }),
      rotationStep: 15,
      appearance: {
        light: {
          track: '#111827',
          canvasBackground: '#F8FAFC',
          grid: '#E7EDF5',
          dimensionLabel: '#FACC15',
        },
        dark: {
          track: '#E5E7EB',
          canvasBackground: '#08111F',
          grid: '#203047',
          dimensionLabel: '#0F172A',
        },
      },
    })
    expect(TRACK_STORAGE_KEYS.editorSettings).toBe('pvcEditorSettings')
  })

  it('reads defaults for missing or malformed storage', () => {
    const missing = new MemoryStorage()
    expect(readEditorSettings(missing)).toEqual(DEFAULT_PVC_EDITOR_SETTINGS)

    const malformed = new MemoryStorage()
    malformed.setItem(TRACK_STORAGE_KEYS.editorSettings, '{')
    expect(readEditorSettings(malformed)).toEqual(DEFAULT_PVC_EDITOR_SETTINGS)
  })

  it('keeps valid fields and falls back invalid fields independently', () => {
    const storage = new MemoryStorage()
    storage.setItem(TRACK_STORAGE_KEYS.editorSettings, JSON.stringify({
      version: 9,
      rotateLeft: binding('KeyQ'),
      rotateRight: binding('Delete'),
      rotationStep: 30,
      appearance: {
        light: {
          track: '#123456',
          canvasBackground: 'white',
          grid: '#ABCDEF',
        },
        dark: {
          dimensionLabel: '#654321',
        },
      },
    }))

    expect(readEditorSettings(storage)).toEqual({
      version: 1,
      rotateLeft: binding('KeyQ'),
      rotateRight: DEFAULT_PVC_EDITOR_SETTINGS.rotateRight,
      rotationStep: 30,
      appearance: {
        light: {
          track: '#123456',
          canvasBackground: DEFAULT_PVC_EDITOR_SETTINGS.appearance.light.canvasBackground,
          grid: '#ABCDEF',
          dimensionLabel: DEFAULT_PVC_EDITOR_SETTINGS.appearance.light.dimensionLabel,
        },
        dark: {
          ...DEFAULT_PVC_EDITOR_SETTINGS.appearance.dark,
          dimensionLabel: '#654321',
        },
      },
    })
  })

  it('falls back to distinct defaults when stored shortcuts are duplicated', () => {
    const storage = new MemoryStorage()
    storage.setItem(TRACK_STORAGE_KEYS.editorSettings, JSON.stringify({
      rotateLeft: binding('KeyQ'),
      rotateRight: binding('KeyQ'),
    }))

    const settings = readEditorSettings(storage)
    expect(settings.rotateLeft).toEqual(DEFAULT_PVC_EDITOR_SETTINGS.rotateLeft)
    expect(settings.rotateRight).toEqual(DEFAULT_PVC_EDITOR_SETTINGS.rotateRight)
  })

  it('writes valid settings and rejects invalid settings', () => {
    const storage = new MemoryStorage()
    const settings: PvcEditorSettings = {
      ...DEFAULT_PVC_EDITOR_SETTINGS,
      rotateLeft: binding('KeyQ'),
      rotateRight: binding('KeyE'),
      rotationStep: 30,
    }

    writeEditorSettings(settings, storage)
    expect(JSON.parse(storage.getItem(TRACK_STORAGE_KEYS.editorSettings) || 'null')).toEqual(settings)

    expect(() => writeEditorSettings({ ...settings, rotationStep: 360 }, storage)).toThrow(
      '旋转步长必须是大于 0 且小于 360 的有限数字',
    )
  })

  it('converts, matches, and formats keyboard shortcuts with exact modifiers', () => {
    const event = keyboardEvent('KeyQ', { ctrlKey: true, shiftKey: true })
    expect(keyboardEventToBinding(event)).toEqual(binding('KeyQ', { ctrl: true, shift: true }))
    expect(shortcutMatchesEvent(binding('KeyQ', { ctrl: true, shift: true }), event)).toBe(true)
    expect(shortcutMatchesEvent(binding('KeyQ', { ctrl: true }), event)).toBe(false)
    expect(formatShortcut(binding('Tab', { shift: true }))).toBe('Shift+Tab')
    expect(formatShortcut(binding('KeyQ', { ctrl: true, alt: true }))).toBe('Ctrl+Alt+Q')
  })

  it('validates duplicate, reserved, modifier-only, step, and color errors', () => {
    const settings = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    settings.rotateLeft = binding('KeyS', { ctrl: true })
    settings.rotateRight = binding('ShiftLeft', { shift: true })
    settings.rotationStep = Number.NaN
    settings.appearance.light.track = '#12345'

    const invalid = validateEditorSettings(settings)
    expect(invalid.valid).toBe(false)
    expect(invalid.errors).toContain('左旋转快捷键与保留快捷键冲突')
    expect(invalid.errors).toContain('右旋转快捷键不能仅使用修饰键')
    expect(invalid.errors).toContain('旋转步长必须是大于 0 且小于 360 的有限数字')
    expect(invalid.errors).toContain('light.track 必须是 #RRGGBB 颜色')

    const duplicate = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    duplicate.rotateRight = binding('Tab')
    expect(validateEditorSettings(duplicate).errors).toContain('左右旋转快捷键不能相同')

    const metaReserved = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    metaReserved.rotateLeft = binding('KeyS', { meta: true })
    expect(validateEditorSettings(metaReserved).errors).toContain('左旋转快捷键与保留快捷键冲突')

    const processKey = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    processKey.rotateLeft = binding('Process')
    expect(validateEditorSettings(processKey).errors).toContain('左旋转快捷键与保留快捷键冲突')

    const browserRefresh = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    browserRefresh.rotateLeft = binding('KeyR', { ctrl: true })
    expect(validateEditorSettings(browserRefresh).errors).toContain('左旋转快捷键与保留快捷键冲突')

    const browserBack = structuredClone(DEFAULT_PVC_EDITOR_SETTINGS) as PvcEditorSettings
    browserBack.rotateLeft = binding('ArrowLeft', { alt: true })
    expect(validateEditorSettings(browserBack).errors).toContain('左旋转快捷键与保留快捷键冲突')
  })

  it('returns a copy of the requested theme colors', () => {
    const colors = getThemeColors(DEFAULT_PVC_EDITOR_SETTINGS, 'dark')
    expect(colors).toEqual(DEFAULT_PVC_EDITOR_SETTINGS.appearance.dark)
    expect(colors).not.toBe(DEFAULT_PVC_EDITOR_SETTINGS.appearance.dark)
  })
})
