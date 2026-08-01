export type ViewBox = {
  x: number
  y: number
  width: number
  height: number
}

type Point = { x: number; y: number }

const MIN_SCALE = 0.18
const MAX_SCALE = 2.5
const REFERENCE_WIDTH = 1000
const ZOOM_SENSITIVITY = 0.0009
const MAX_DELTA_PER_FRAME = 600
const CANVAS_BOUNDS = { x: -2000, y: -1000, width: 4000, height: 2000 }

const clampOrigin = (origin: number, size: number, min: number, available: number) => {
  if (size >= available) return min + (available - size) / 2
  return Math.max(min, Math.min(min + available - size, origin))
}

export function normalizeWheelDelta(deltaY: number, deltaMode: number, pageHeight: number) {
  if (deltaMode === 1) return deltaY * 16
  if (deltaMode === 2) return deltaY * pageHeight
  return deltaY
}

export function zoomViewBox(current: ViewBox, anchor: Point, wheelDelta: number): ViewBox {
  const limitedDelta = Math.max(-MAX_DELTA_PER_FRAME, Math.min(MAX_DELTA_PER_FRAME, wheelDelta))
  const requestedFactor = Math.exp(limitedDelta * ZOOM_SENSITIVITY)
  const minWidth = REFERENCE_WIDTH / MAX_SCALE
  const maxWidth = REFERENCE_WIDTH / MIN_SCALE
  const newWidth = Math.max(minWidth, Math.min(maxWidth, current.width * requestedFactor))
  const appliedFactor = newWidth / current.width
  const newHeight = current.height * appliedFactor
  const anchorRatioX = (anchor.x - current.x) / current.width
  const anchorRatioY = (anchor.y - current.y) / current.height
  const requestedX = anchor.x - anchorRatioX * newWidth
  const requestedY = anchor.y - anchorRatioY * newHeight

  return {
    x: clampOrigin(requestedX, newWidth, CANVAS_BOUNDS.x, CANVAS_BOUNDS.width),
    y: clampOrigin(requestedY, newHeight, CANVAS_BOUNDS.y, CANVAS_BOUNDS.height),
    width: newWidth,
    height: newHeight,
  }
}

export function easeViewBox(start: ViewBox, target: ViewBox, progress: number): ViewBox {
  const normalized = Math.max(0, Math.min(1, progress))
  const eased = 1 - (1 - normalized) ** 3
  return {
    x: start.x + (target.x - start.x) * eased,
    y: start.y + (target.y - start.y) * eased,
    width: start.width + (target.width - start.width) * eased,
    height: start.height + (target.height - start.height) * eased,
  }
}
