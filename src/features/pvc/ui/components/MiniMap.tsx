import React from 'react'
import type { TrackPiece } from '../../domain/types'

type MiniMapProps = {
  pieces: TrackPiece[]
  viewBox: { x: number; y: number; width: number; height: number }
  dragging: boolean
  onMouseDown?: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove?: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp?: (e: React.MouseEvent<SVGSVGElement>) => void
}

const miniWidth = 300
const miniHeight = 150
const designX = -2000
const designY = -1000
const designW = 4000
const designH = 2000
const scaleX = miniWidth / designW
const scaleY = miniHeight / designH

export const MINI_MAP_METRICS = {
  miniWidth,
  miniHeight,
  designX,
  designY,
  scaleX,
  scaleY,
}

export function MiniMap({ pieces, viewBox, dragging, onMouseDown, onMouseMove, onMouseUp }: MiniMapProps) {
  const rectX = (viewBox.x - designX) * scaleX
  const rectY = (viewBox.y - designY) * scaleY
  const rectW = viewBox.width * scaleX
  const rectH = viewBox.height * scaleY

  return (
    <svg
      width={miniWidth}
      height={miniHeight}
      viewBox={`0 0 ${miniWidth} ${miniHeight}`}
      style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: dragging ? 'grabbing' : 'pointer' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onMouseDown={onMouseDown}
    >
      {pieces.map((piece) => {
        if (piece.type === 'straight') {
          const x1 = (piece.x - designX) * scaleX
          const y1 = (piece.y - designY) * scaleY
          const x2 = (piece.x + piece.params.length * Math.cos((piece.rotation || 0) * Math.PI / 180) - designX) * scaleX
          const y2 = (piece.y + piece.params.length * Math.sin((piece.rotation || 0) * Math.PI / 180) - designY) * scaleY
          return <line key={piece.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6366f1" strokeWidth={4} strokeLinecap="round" />
        }

        if (piece.type === 'curve') {
          const r = piece.params.radius * 2
          const angle = piece.params.angle
          const rot = (piece.rotation || 0) * Math.PI / 180
          const cx = (piece.x - designX) * scaleX
          const cy = (piece.y - designY) * scaleY
          const startAngle = rot
          const endAngle = rot + angle * Math.PI / 180
          const x1 = cx + r * Math.cos(startAngle) * scaleX
          const y1 = cy + r * Math.sin(startAngle) * scaleY
          const x2 = cx + r * Math.cos(endAngle) * scaleX
          const y2 = cy + r * Math.sin(endAngle) * scaleY
          const largeArc = angle > 180 ? 1 : 0
          const d = `M${x1},${y1} A${r * scaleX},${r * scaleY} 0 ${largeArc} 1 ${x2},${y2}`
          return <path key={piece.id} d={d} stroke="#f59e42" strokeWidth={4} fill="none" />
        }

        return null
      })}
      <rect
        x={rectX}
        y={rectY}
        width={rectW}
        height={rectH}
        fill="none"
        stroke="#ef4444"
        strokeWidth={2.5}
        strokeDasharray="6,3"
        rx={3}
        style={{ cursor: 'grab', pointerEvents: 'all' }}
      />
    </svg>
  )
}
