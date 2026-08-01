import React from 'react'

export const PVC_ONBOARDING_VERSION = '1'

type TourStep = {
  target: string
  kicker: string
  title: string
  description: string
  demo: 'place' | 'custom' | 'pan' | 'zoom' | 'files'
  placeInside?: boolean
}

type Rect = { left: number; top: number; width: number; height: number }

const steps: TourStep[] = [
  {
    target: 'track-palette',
    kicker: '第 1 步',
    title: '放置赛道',
    description: '点击上方的直道或弯道尺寸，赛道片会添加到画布中央。',
    demo: 'place',
  },
  {
    target: 'custom-track',
    kicker: '第 2 步',
    title: '自定义赛道尺寸',
    description: '打开“自定义”，可输入直道长度，或设置弯道半径与角度。',
    demo: 'custom',
  },
  {
    target: 'canvas',
    kicker: '第 3 步',
    title: '中键平移画布',
    description: '按住鼠标滚轮中键并拖动，可向上下左右自由移动画布。',
    demo: 'pan',
    placeInside: true,
  },
  {
    target: 'canvas',
    kicker: '第 4 步',
    title: '滚轮连续缩放',
    description: '滚动鼠标滚轮即可平滑缩放，缩放中心始终跟随鼠标位置。',
    demo: 'zoom',
    placeInside: true,
  },
  {
    target: 'file-actions',
    kicker: '第 5 步',
    title: '导入与导出',
    description: '可导入赛道 JSON，并将当前设计导出为图片或赛道 JSON 文件。',
    demo: 'files',
  },
]

function getTargetRect(target: string): Rect | null {
  const rects = [...document.querySelectorAll<HTMLElement>(`[data-tour~="${target}"]`)]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)

  if (rects.length === 0) return null

  const left = Math.min(...rects.map((rect) => rect.left))
  const top = Math.min(...rects.map((rect) => rect.top))
  const right = Math.max(...rects.map((rect) => rect.right))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  const padding = 8

  return {
    left: Math.max(8, left - padding),
    top: Math.max(8, top - padding),
    width: Math.min(window.innerWidth - 16, right - left + padding * 2),
    height: Math.min(window.innerHeight - 16, bottom - top + padding * 2),
  }
}

function getCardPosition(target: Rect, card: DOMRect, placeInside = false) {
  const gap = 18
  const margin = 16
  const maxLeft = Math.max(margin, window.innerWidth - card.width - margin)
  const maxTop = Math.max(margin, window.innerHeight - card.height - margin)
  const clampLeft = (value: number) => Math.min(maxLeft, Math.max(margin, value))
  const clampTop = (value: number) => Math.min(maxTop, Math.max(margin, value))

  if (placeInside) {
    return {
      left: clampLeft(target.left + 24),
      top: clampTop(target.top + 24),
    }
  }

  const centeredLeft = clampLeft(target.left + target.width / 2 - card.width / 2)
  if (target.top + target.height + gap + card.height <= window.innerHeight - margin) {
    return { left: centeredLeft, top: target.top + target.height + gap }
  }
  if (target.top - gap - card.height >= margin) {
    return { left: centeredLeft, top: target.top - gap - card.height }
  }

  return {
    left: clampLeft(target.left + target.width + gap),
    top: clampTop(target.top + target.height / 2 - card.height / 2),
  }
}

function TourDemo({ kind }: { kind: TourStep['demo'] }) {
  if (kind === 'place') {
    return <div className="tour-demo tour-demo-place" aria-hidden="true">
      <span className="tour-demo-button">L50</span>
      <span className="tour-demo-track" />
      <span className="tour-demo-grid" />
    </div>
  }

  if (kind === 'custom') {
    return <div className="tour-demo tour-demo-custom" aria-hidden="true">
      <span className="tour-demo-field"><b>长度</b><i>75</i></span>
      <span className="tour-demo-field"><b>半径</b><i>50</i></span>
      <span className="tour-demo-field"><b>角度</b><i>90</i></span>
    </div>
  }

  if (kind === 'files') {
    return <div className="tour-demo tour-demo-files" aria-hidden="true">
      <span><b>↓</b> JSON</span>
      <span><b>↑</b> PNG</span>
      <span><b>↑</b> JSON</span>
    </div>
  }

  return <div className={`tour-demo tour-demo-mouse tour-demo-${kind}`} aria-hidden="true">
    <span className="tour-demo-ring" />
    <span className="tour-demo-mouse-body"><i /></span>
    {kind === 'pan' ? <><b className="tour-demo-horizontal">↔</b><b className="tour-demo-vertical">↕</b></> : null}
  </div>
}

type OnboardingTourProps = {
  open: boolean
  isDark: boolean
  onClose: () => void
}

export function OnboardingTour({ open, isDark, onClose }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = React.useState(0)
  const [targetRect, setTargetRect] = React.useState<Rect | null>(null)
  const [cardPosition, setCardPosition] = React.useState({ left: 16, top: 16 })
  const cardRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)
  const step = steps[stepIndex]

  const measure = React.useCallback(() => {
    const nextTarget = getTargetRect(step.target)
    if (!nextTarget) return
    setTargetRect(nextTarget)

    const card = cardRef.current?.getBoundingClientRect()
    if (card) setCardPosition(getCardPosition(nextTarget, card, step.placeInside))
  }, [step])

  React.useLayoutEffect(() => {
    if (!open) return
    setStepIndex(0)
  }, [open])

  React.useLayoutEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
    }
  }, [measure, open])

  React.useLayoutEffect(() => {
    if (!open || !targetRect) return
    const frame = requestAnimationFrame(() => {
      const card = cardRef.current?.getBoundingClientRect()
      if (card) setCardPosition(getCardPosition(targetRect, card, step.placeInside))
    })
    return () => cancelAnimationFrame(frame)
  }, [open, step.placeInside, targetRect])

  React.useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    return () => previousFocusRef.current?.focus()
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !cardRef.current) return

      const focusable = [...cardRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!cardRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    cardRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open, stepIndex, targetRect])

  if (!open || !targetRect) return null

  const targetBottom = targetRect.top + targetRect.height
  const targetRight = targetRect.left + targetRect.width
  const isLast = stepIndex === steps.length - 1

  return <div className={`onboarding-tour ${isDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-label="新手引导">
    <div className="onboarding-shade" style={{ left: 0, top: 0, right: 0, height: targetRect.top }} />
    <div className="onboarding-shade" style={{ left: 0, top: targetBottom, right: 0, bottom: 0 }} />
    <div className="onboarding-shade" style={{ left: 0, top: targetRect.top, width: targetRect.left, height: targetRect.height }} />
    <div className="onboarding-shade" style={{ left: targetRight, top: targetRect.top, right: 0, height: targetRect.height }} />
    <div
      className="onboarding-spotlight"
      data-tour-highlight={step.target}
      style={targetRect}
    />
    <div
      ref={cardRef}
      className="onboarding-card"
      style={cardPosition}
      tabIndex={-1}
    >
      <button className="onboarding-close" type="button" onClick={onClose} aria-label="跳过新手引导" title="跳过">×</button>
      <div className="onboarding-kicker">{step.kicker} · {steps.length} 步快速入门</div>
      <h2>{step.title}</h2>
      <p>{step.description}</p>
      <TourDemo kind={step.demo} />
      <div className="onboarding-progress" aria-label={`当前第 ${stepIndex + 1} 步，共 ${steps.length} 步`}>
        {steps.map((item, index) => <span key={item.target + index} className={index === stepIndex ? 'is-active' : ''} />)}
      </div>
      <div className="onboarding-actions">
        <button type="button" className="onboarding-skip" onClick={onClose}>跳过</button>
        <div>
          <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)}>上一步</button>
          <button type="button" className="onboarding-next" onClick={() => isLast ? onClose() : setStepIndex((index) => index + 1)}>
            {isLast ? '完成' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  </div>
}
