import { TRACK_STORAGE_KEYS } from './storage'

export type ShortcutBinding = {
  code: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
}

export type ThemeMode = 'light' | 'dark'

export type PvcCanvasColors = {
  track: string
  canvasBackground: string
  grid: string
  dimensionLabel: string
}

export type PvcEditorSettings = {
  version: 1
  rotateLeft: ShortcutBinding
  rotateRight: ShortcutBinding
  rotationStep: number
  appearance: {
    light: PvcCanvasColors
    dark: PvcCanvasColors
  }
}

export type EditorSettingsValidation = {
  valid: boolean
  errors: string[]
}

type SettingsStorageReader = Pick<Storage, 'getItem'>
type SettingsStorageWriter = Pick<Storage, 'setItem'>
type KeyboardEventLike = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const MODIFIER_CODES = new Set([
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
  'ShiftLeft',
  'ShiftRight',
])
const RESERVED_CTRL_CODES = new Set([
  'KeyA', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL',
  'KeyN', 'KeyO', 'KeyP', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyW', 'KeyY', 'KeyZ',
])
const RESERVED_ALT_CODES = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'F4'])
const RESERVED_CODES = new Set([
  'Delete', 'Escape', 'F5', 'Process', 'Unidentified',
  'BrowserBack', 'BrowserForward', 'BrowserRefresh',
])
const COLOR_KEYS: Array<keyof PvcCanvasColors> = ['track', 'canvasBackground', 'grid', 'dimensionLabel']

export const DEFAULT_PVC_EDITOR_SETTINGS: PvcEditorSettings = {
  version: 1,
  rotateLeft: { code: 'Tab', ctrl: false, shift: false, alt: false, meta: false },
  rotateRight: { code: 'Tab', ctrl: false, shift: true, alt: false, meta: false },
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneBinding(binding: ShortcutBinding): ShortcutBinding {
  return { ...binding }
}

function cloneColors(colors: PvcCanvasColors): PvcCanvasColors {
  return { ...colors }
}

function cloneDefaultSettings(): PvcEditorSettings {
  return {
    version: 1,
    rotateLeft: cloneBinding(DEFAULT_PVC_EDITOR_SETTINGS.rotateLeft),
    rotateRight: cloneBinding(DEFAULT_PVC_EDITOR_SETTINGS.rotateRight),
    rotationStep: DEFAULT_PVC_EDITOR_SETTINGS.rotationStep,
    appearance: {
      light: cloneColors(DEFAULT_PVC_EDITOR_SETTINGS.appearance.light),
      dark: cloneColors(DEFAULT_PVC_EDITOR_SETTINGS.appearance.dark),
    },
  }
}

function shortcutIssue(value: unknown): 'format' | 'modifier' | 'reserved' | null {
  if (!isRecord(value)
    || typeof value.code !== 'string'
    || value.code.trim() === ''
    || typeof value.ctrl !== 'boolean'
    || typeof value.shift !== 'boolean'
    || typeof value.alt !== 'boolean'
    || typeof value.meta !== 'boolean') {
    return 'format'
  }

  if (MODIFIER_CODES.has(value.code)) return 'modifier'
  if (RESERVED_CODES.has(value.code)) return 'reserved'
  if ((value.ctrl || value.meta) && RESERVED_CTRL_CODES.has(value.code)) return 'reserved'
  if (value.alt && RESERVED_ALT_CODES.has(value.code)) return 'reserved'
  return null
}

function shortcutsEqual(left: ShortcutBinding, right: ShortcutBinding) {
  return left.code === right.code
    && left.ctrl === right.ctrl
    && left.shift === right.shift
    && left.alt === right.alt
    && left.meta === right.meta
}

function readBinding(value: unknown, fallback: ShortcutBinding): ShortcutBinding {
  return shortcutIssue(value) === null
    ? cloneBinding(value as ShortcutBinding)
    : cloneBinding(fallback)
}

function readColors(value: unknown, fallback: PvcCanvasColors): PvcCanvasColors {
  const source = isRecord(value) ? value : {}
  return {
    track: typeof source.track === 'string' && HEX_COLOR_PATTERN.test(source.track) ? source.track : fallback.track,
    canvasBackground: typeof source.canvasBackground === 'string' && HEX_COLOR_PATTERN.test(source.canvasBackground)
      ? source.canvasBackground
      : fallback.canvasBackground,
    grid: typeof source.grid === 'string' && HEX_COLOR_PATTERN.test(source.grid) ? source.grid : fallback.grid,
    dimensionLabel: typeof source.dimensionLabel === 'string' && HEX_COLOR_PATTERN.test(source.dimensionLabel)
      ? source.dimensionLabel
      : fallback.dimensionLabel,
  }
}

export function readEditorSettings(storage: SettingsStorageReader = localStorage): PvcEditorSettings {
  let value: unknown
  try {
    value = JSON.parse(storage.getItem(TRACK_STORAGE_KEYS.editorSettings) || 'null')
  } catch {
    return cloneDefaultSettings()
  }

  if (!isRecord(value)) return cloneDefaultSettings()

  const appearance = isRecord(value.appearance) ? value.appearance : {}
  const settings: PvcEditorSettings = {
    version: 1,
    rotateLeft: readBinding(value.rotateLeft, DEFAULT_PVC_EDITOR_SETTINGS.rotateLeft),
    rotateRight: readBinding(value.rotateRight, DEFAULT_PVC_EDITOR_SETTINGS.rotateRight),
    rotationStep: typeof value.rotationStep === 'number'
      && Number.isFinite(value.rotationStep)
      && value.rotationStep > 0
      && value.rotationStep < 360
      ? value.rotationStep
      : DEFAULT_PVC_EDITOR_SETTINGS.rotationStep,
    appearance: {
      light: readColors(appearance.light, DEFAULT_PVC_EDITOR_SETTINGS.appearance.light),
      dark: readColors(appearance.dark, DEFAULT_PVC_EDITOR_SETTINGS.appearance.dark),
    },
  }

  if (shortcutsEqual(settings.rotateLeft, settings.rotateRight)) {
    settings.rotateLeft = cloneBinding(DEFAULT_PVC_EDITOR_SETTINGS.rotateLeft)
    settings.rotateRight = cloneBinding(DEFAULT_PVC_EDITOR_SETTINGS.rotateRight)
  }

  return settings
}

export function writeEditorSettings(
  settings: PvcEditorSettings,
  storage: SettingsStorageWriter = localStorage,
) {
  const validation = validateEditorSettings(settings)
  if (!validation.valid) throw new Error(validation.errors.join('; '))
  storage.setItem(TRACK_STORAGE_KEYS.editorSettings, JSON.stringify(settings))
}

export function getThemeColors(settings: PvcEditorSettings, theme: ThemeMode): PvcCanvasColors {
  return cloneColors(settings.appearance[theme])
}

export function keyboardEventToBinding(event: KeyboardEventLike): ShortcutBinding {
  return {
    code: event.code,
    ctrl: event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    meta: event.metaKey,
  }
}

export function shortcutMatchesEvent(binding: ShortcutBinding, event: KeyboardEventLike) {
  return binding.code === event.code
    && binding.ctrl === event.ctrlKey
    && binding.shift === event.shiftKey
    && binding.alt === event.altKey
    && binding.meta === event.metaKey
}

function formatCode(code: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  return code
}

export function formatShortcut(binding: ShortcutBinding) {
  const parts: string[] = []
  if (binding.ctrl) parts.push('Ctrl')
  if (binding.shift) parts.push('Shift')
  if (binding.alt) parts.push('Alt')
  if (binding.meta) parts.push('Meta')
  parts.push(formatCode(binding.code))
  return parts.join('+')
}

export function validateEditorSettings(settings: unknown): EditorSettingsValidation {
  const errors: string[] = []
  if (!isRecord(settings)) return { valid: false, errors: ['设置格式无效'] }

  if (settings.version !== 1) errors.push('设置版本必须为 1')

  const leftIssue = shortcutIssue(settings.rotateLeft)
  const rightIssue = shortcutIssue(settings.rotateRight)
  const issueMessage = (label: string, issue: ReturnType<typeof shortcutIssue>) => {
    if (issue === 'format') return `${label}快捷键格式无效`
    if (issue === 'modifier') return `${label}快捷键不能仅使用修饰键`
    return `${label}快捷键与保留快捷键冲突`
  }

  if (leftIssue) errors.push(issueMessage('左旋转', leftIssue))
  if (rightIssue) errors.push(issueMessage('右旋转', rightIssue))
  if (!leftIssue && !rightIssue && shortcutsEqual(
    settings.rotateLeft as ShortcutBinding,
    settings.rotateRight as ShortcutBinding,
  )) {
    errors.push('左右旋转快捷键不能相同')
  }

  if (typeof settings.rotationStep !== 'number'
    || !Number.isFinite(settings.rotationStep)
    || settings.rotationStep <= 0
    || settings.rotationStep >= 360) {
    errors.push('旋转步长必须是大于 0 且小于 360 的有限数字')
  }

  if (!isRecord(settings.appearance)) {
    errors.push('外观设置格式无效')
  } else {
    for (const theme of ['light', 'dark'] as const) {
      const colors = settings.appearance[theme]
      if (!isRecord(colors)) {
        errors.push(`${theme} 主题颜色格式无效`)
        continue
      }
      for (const key of COLOR_KEYS) {
        if (typeof colors[key] !== 'string' || !HEX_COLOR_PATTERN.test(colors[key] as string)) {
          errors.push(`${theme}.${key} 必须是 #RRGGBB 颜色`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
