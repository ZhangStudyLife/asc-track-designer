import React from 'react'
import { usePvcEditorStore } from '../../application/editorStore'
import { getConnectionPoint, getDistance } from '../../domain/geometry'
import type { ConnectionPointRef } from '../../domain/types'

type MeasurementOverlayProps = {
  points: ConnectionPointRef[]
}

export function MeasurementOverlay({ points }: MeasurementOverlayProps) {
  const firstPiece = usePvcEditorStore((state) => (
    points[0] ? state.piecesById[points[0].pieceId] : undefined
  ))
  const secondPiece = usePvcEditorStore((state) => (
    points[1] ? state.piecesById[points[1].pieceId] : undefined
  ))

  if (points.length !== 2) return null

  const pieces = [firstPiece, secondPiece].filter(Boolean)
  const pt1 = getConnectionPoint(pieces, points[0])
  const pt2 = getConnectionPoint(pieces, points[1])

  return (
    <>
      <line
        x1={pt1.x}
        y1={pt1.y}
        x2={pt2.x}
        y2={pt2.y}
        stroke="#f59e42"
        strokeWidth={3}
        strokeDasharray="6,3"
      />
      <circle cx={pt1.x} cy={pt1.y} r={7} fill="none" stroke="#f59e42" strokeWidth={2} />
      <circle cx={pt2.x} cy={pt2.y} r={7} fill="none" stroke="#f59e42" strokeWidth={2} />
      <text
        x={(pt1.x + pt2.x) / 2}
        y={(pt1.y + pt2.y) / 2 - 10}
        textAnchor="middle"
        fontSize="20px"
        fill="#f59e42"
        fontWeight="bold"
        style={{ userSelect: 'none', textShadow: '1px 1px 2px #fff' }}
      >
        {`${(getDistance(pt1, pt2) / 2).toFixed(1)} mm`}
      </text>
    </>
  )
}
