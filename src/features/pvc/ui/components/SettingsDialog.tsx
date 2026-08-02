import React from 'react'
import {
  DEFAULT_PVC_EDITOR_SETTINGS,
  formatShortcut,
  keyboardEventToBinding,
  validateEditorSettings,
  type PvcEditorSettings,
} from '../../application/editorSettings'

type SettingsDialogProps = {
  open: boolean
  isDark: boolean
  value: PvcEditorSettings
  onCancel: () => void
  onSave: (value: PvcEditorSettings) => void
}

type ShortcutName = 'rotateLeft' | 'rotateRight'
type ThemeName = 'light' | 'dark'
type ColorName = 'track' | 'canvasBackground' | 'grid' | 'dimensionLabel'

const colorFields: Array<{ name: ColorName; label: string; ariaLabel: string }> = [
  { name: 'track', label: '赛道', ariaLabel: '赛道颜色' },
  { name: 'canvasBackground', label: '画布', ariaLabel: '画布颜色' },
  { name: 'grid', label: '网格', ariaLabel: '网格颜色' },
  { name: 'dimensionLabel', label: '尺寸标注', ariaLabel: '尺寸标注颜色' },
]

function cloneSettings(value: PvcEditorSettings): PvcEditorSettings {
  return {
    ...value,
    rotateLeft: { ...value.rotateLeft },
    rotateRight: { ...value.rotateRight },
    appearance: {
      light: { ...value.appearance.light },
      dark: { ...value.appearance.dark },
    },
  }
}

function shortcutsEqual(value: PvcEditorSettings) {
  return value.rotateLeft.code === value.rotateRight.code
    && value.rotateLeft.ctrl === value.rotateRight.ctrl
    && value.rotateLeft.shift === value.rotateRight.shift
    && value.rotateLeft.alt === value.rotateRight.alt
    && value.rotateLeft.meta === value.rotateRight.meta
}

function validationError(value: PvcEditorSettings) {
  const result = validateEditorSettings(value)
  if (result.valid) return ''
  if (!Number.isFinite(value.rotationStep) || value.rotationStep <= 0 || value.rotationStep >= 360) {
    return '旋转步长必须大于 0° 且小于 360°。'
  }
  if (shortcutsEqual(value)) return '左旋和右旋快捷键不能相同。'
  return '快捷键或颜色设置无效，请检查后重试。'
}

export function SettingsDialog({ open, isDark, value, onCancel, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = React.useState(() => cloneSettings(value))
  const [rotationStep, setRotationStep] = React.useState(String(value.rotationStep))
  const [capturing, setCapturing] = React.useState<ShortcutName | null>(null)
  const [error, setError] = React.useState('')
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const wasOpenRef = React.useRef(false)
  const theme: ThemeName = isDark ? 'dark' : 'light'

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft(cloneSettings(value))
      setRotationStep(String(value.rotationStep))
      setCapturing(null)
      setError('')
      requestAnimationFrame(() => dialogRef.current?.focus())
    }
    wasOpenRef.current = open
  }, [open, value])

  React.useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.code === 'Process' || event.code === 'Unidentified') {
        if (capturing) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          setError('输入法组合键不能设置为快捷键，请切换到直接按键后重试。')
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        if (capturing) {
          setCapturing(null)
          setError('')
        } else {
          onCancel()
        }
        return
      }

      if (!capturing) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      try {
        const binding = keyboardEventToBinding(event)
        if (!binding) {
          setError('该按键不能设置为快捷键，请重新按键。')
          return
        }

        const candidate = { ...draft, [capturing]: binding }
        if (!validateEditorSettings(candidate).valid) {
          setError('该快捷键不可用、已被保留或与另一个旋转快捷键冲突，请重新按键。')
          return
        }

        setDraft(candidate)
        setCapturing(null)
        setError('')
      } catch (captureError) {
        setError(captureError instanceof Error && captureError.message
          ? captureError.message
          : '快捷键识别失败，请重新按键。')
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [capturing, draft, onCancel, open])

  if (!open) return null

  const colors = draft.appearance[theme]
  const palette = isDark
    ? {
        overlay: 'rgba(2, 8, 23, 0.76)',
        panel: '#0f172a',
        panelSoft: '#111c30',
        border: '#334155',
        text: '#e5e7eb',
        muted: '#94a3b8',
        input: '#08111f',
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
        input: '#ffffff',
        primary: '#2563eb',
        primaryText: '#ffffff',
        danger: '#b91c1c',
      }

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    color: palette.muted,
    fontSize: 12,
    fontWeight: 600,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 34,
    padding: '0 10px',
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    background: palette.input,
    color: palette.text,
    fontSize: 13,
    outline: 'none',
  }
  const buttonStyle: React.CSSProperties = {
    minHeight: 34,
    padding: '0 12px',
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    background: palette.panelSoft,
    color: palette.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }

  const beginCapture = (event: React.MouseEvent<HTMLButtonElement>, name: ShortcutName) => {
    event.preventDefault()
    event.stopPropagation()
    setCapturing((current) => current === name ? null : name)
    setError('')
  }

  const updateColor = (name: ColorName, color: string) => {
    setDraft((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        [theme]: {
          ...current.appearance[theme],
          [name]: color,
        },
      },
    }))
    setError('')
  }

  const resetCurrentTheme = () => {
    setDraft((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        [theme]: { ...DEFAULT_PVC_EDITOR_SETTINGS.appearance[theme] },
      },
    }))
    setError('')
  }

  const cancel = () => {
    setCapturing(null)
    setError('')
    onCancel()
  }

  const save = () => {
    const candidate = {
      ...draft,
      rotationStep: Number(rotationStep),
    }
    const message = validationError(candidate)
    if (message) {
      setError(message)
      return
    }

    setCapturing(null)
    setError('')
    onSave(candidate)
  }

  const shortcutButton = (name: ShortcutName, label: string, ariaLabel: string) => (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={capturing === name}
        onClick={(event) => beginCapture(event, name)}
        style={{
          ...buttonStyle,
          width: '100%',
          borderColor: capturing === name ? palette.primary : palette.border,
          color: capturing === name ? palette.primary : palette.text,
          background: capturing === name ? palette.input : palette.panelSoft,
        }}
      >
        {capturing === name ? '请按下新的快捷键…' : formatShortcut(draft[name])}
      </button>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: palette.overlay,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="编辑器设置"
        tabIndex={-1}
        style={{
          width: 'min(560px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          border: `1px solid ${palette.border}`,
          borderRadius: 8,
          background: palette.panel,
          color: palette.text,
          boxShadow: '0 20px 60px rgba(2, 8, 23, 0.28)',
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <form
          onFocusCapture={(event) => {
            if (event.target instanceof HTMLInputElement) setCapturing(null)
          }}
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <header style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${palette.border}` }}>
            <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.3 }}>编辑器设置</h2>
            <p style={{ margin: '5px 0 0', color: palette.muted, fontSize: 12 }}>
              配置旋转操作和当前{isDark ? '夜间' : '白天'}主题的画布颜色。
            </p>
          </header>

          <div style={{ display: 'grid', gap: 16, padding: 18 }}>
            <section aria-label="旋转设置">
              <h3 style={{ margin: '0 0 10px', fontSize: 13 }}>旋转</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {shortcutButton('rotateLeft', '左旋快捷键', '设置左旋快捷键')}
                {shortcutButton('rotateRight', '右旋快捷键', '设置右旋快捷键')}
                <div>
                  <label htmlFor="editor-rotation-step" style={fieldLabelStyle}>每次旋转角度</label>
                  <input
                    id="editor-rotation-step"
                    aria-label="旋转步长"
                    type="number"
                    min="0.1"
                    max="360"
                    step="0.1"
                    value={rotationStep}
                    onChange={(event) => {
                      setRotationStep(event.target.value)
                      setError('')
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            <section aria-label="颜色设置">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 13 }}>{isDark ? '夜间' : '白天'}主题颜色</h3>
                <button
                  type="button"
                  aria-label="恢复当前主题默认颜色"
                  onClick={resetCurrentTheme}
                  style={{ ...buttonStyle, minHeight: 30, fontSize: 12 }}
                >
                  恢复默认
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                {colorFields.map((field) => (
                  <label key={field.name} style={{ ...fieldLabelStyle, margin: 0 }}>
                    <span style={{ display: 'block', marginBottom: 6 }}>{field.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        aria-label={field.ariaLabel}
                        value={colors[field.name]}
                        onChange={(event) => updateColor(field.name, event.target.value)}
                        style={{
                          width: 38,
                          height: 32,
                          padding: 2,
                          border: `1px solid ${palette.border}`,
                          borderRadius: 6,
                          background: palette.input,
                          cursor: 'pointer',
                        }}
                      />
                      <code style={{ color: palette.muted, fontSize: 11 }}>{colors[field.name].toUpperCase()}</code>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {error ? (
              <div
                role="alert"
                style={{
                  padding: '9px 11px',
                  border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                  borderRadius: 6,
                  background: isDark ? '#2a1420' : '#fef2f2',
                  color: palette.danger,
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            ) : null}
          </div>

          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: `1px solid ${palette.border}` }}>
            <button type="button" aria-label="取消设置" onClick={cancel} style={buttonStyle}>取消</button>
            <button
              type="submit"
              aria-label="保存设置"
              style={{
                ...buttonStyle,
                borderColor: palette.primary,
                background: palette.primary,
                color: palette.primaryText,
              }}
            >
              保存
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default SettingsDialog
