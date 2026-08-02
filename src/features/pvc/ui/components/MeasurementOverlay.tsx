import React from 'react'
import { usePvcEditorStore } from '../../application/editorStore'
import { getMeasurementDistances, resolveMeasurementPoint } from '../../domain/geometry'
import type { MeasurementPointRef } from '../../domain/types'

type MeasurementOverlayProps = {
  points: MeasurementPointRef[]
}

function formatDelta(value: number) {
  const formatted = value.toFixed(1)
  return value > 0 ? `+${formatted}` : formatted
}

function getReferencedPieceId(point?: MeasurementPointRef) {
  return point && point.kind !== 'canvas' ? point.pieceId : null
}

export function MeasurementOverlay({ points }: MeasurementOverlayProps) {
  const firstPieceId = getReferencedPieceId(points[0])
  const secondPieceId = getReferencedPieceId(points[1])
  const firstPiece = usePvcEditorStore((state) => (
    firstPieceId === null ? undefined : state.piecesById[firstPieceId]
  ))
  const secondPiece = usePvcEditorStore((state) => (
    secondPieceId === null ? undefined : state.piecesById[secondPieceId]
  ))
  const pieces = [firstPiece, secondPiece].filter((piece) => piece !== undefined)
  const first = points[0] ? resolveMeasurementPoint(pieces, points[0]) : null
  const second = points[1] ? resolveMeasurementPoint(pieces, points[1]) : null

  if (!first) return null

  if (!second) {
    return (
      <circle
        data-measure-result="start"
        cx={first.x}
        cy={first.y}
        r={7}
        fill="none"
        stroke="#f59e42"
        strokeWidth={2}
        pointerEvents="none"
      />
    )
  }

  const distances = getMeasurementDistances(first, second)
  const labelX = (first.x + second.x) / 2
  const labelY = (first.y + second.y) / 2 - 24

  return (
    <g data-measure-result="complete" pointerEvents="none">
      <line
        x1={first.x}
        y1={first.y}
        x2={second.x}
        y2={second.y}
        stroke="#f59e42"
        strokeWidth={3}
        strokeDasharray="6,3"
      />
      <circle cx={first.x} cy={first.y} r={7} fill="none" stroke="#f59e42" strokeWidth={2} />
      <circle cx={second.x} cy={second.y} r={7} fill="none" stroke="#f59e42" strokeWidth={2} />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize="18px"
        fill="#f59e42"
        fontWeight="bold"
        paintOrder="stroke"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        style={{ userSelect: 'none' }}
      >
        <tspan x={labelX}>{`总长 ${distances.total.toFixed(1)} mm`}</tspan>
        <tspan x={labelX} dy="22">{`ΔX ${formatDelta(distances.deltaX)} mm · ΔY ${formatDelta(distances.deltaY)} mm`}</tspan>
      </text>
    </g>
  )
}
