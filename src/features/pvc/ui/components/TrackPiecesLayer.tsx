import React from 'react'
import { usePvcEditorStore } from '../../application/editorStore'
import type { ConnectionPointRef, TrackPiece } from '../../domain/types'

type TrackPiecesLayerProps = {
  selectedId: number | null
  selectedIds: ReadonlySet<number>
  isDark: boolean
  isMeasuring: boolean
  isAutoFill: boolean
  onMouseDown: (event: React.MouseEvent, piece: TrackPiece) => void
  onDoubleClick: (piece: TrackPiece) => void
  onMeasurePointClick: (point: ConnectionPointRef) => void
  onAutoFillPointClick: (point: ConnectionPointRef) => void
}

type TrackPieceViewProps = Omit<TrackPiecesLayerProps, 'selectedId' | 'selectedIds'> & {
  pieceId: number
  isSelected: boolean
}

function TrackPieceView({
  pieceId,
  isSelected,
  isDark,
  isMeasuring,
  isAutoFill,
  onMouseDown,
  onDoubleClick,
  onMeasurePointClick,
  onAutoFillPointClick,
}: TrackPieceViewProps) {
  const piece = usePvcEditorStore((state) => state.piecesById[pieceId])
  if (!piece) return null

  const connectionPointProps = (type: 'start' | 'end') => ({
    fill: type === 'start' ? '#10b981' : '#dc2626',
    stroke: type === 'start' ? '#065f46' : '#7f1d1d',
    strokeWidth: 1,
    style: {
      cursor: (isMeasuring || isAutoFill) ? 'crosshair' : 'not-allowed',
      opacity: (isMeasuring || isAutoFill) ? 1 : 0.5,
    },
    onClick: isMeasuring
      ? (event: React.MouseEvent) => {
          event.stopPropagation()
          onMeasurePointClick({ pieceId: piece.id, type })
        }
      : isAutoFill
        ? (event: React.MouseEvent) => {
            event.stopPropagation()
            onAutoFillPointClick({ pieceId: piece.id, type })
          }
        : undefined,
  })

  if (piece.type === 'straight') {
    const length = piece.params.length * 2
    const width = 45 * 2

    return (
      <g data-piece-id={piece.id} transform={`translate(${piece.x}, ${piece.y}) rotate(${piece.rotation || 0})`}>
        <rect
          x={0}
          y={-width / 2}
          width={length}
          height={width}
          fill={isDark ? '#e5e7eb' : '#111827'}
          stroke={isSelected ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
          strokeWidth={isSelected ? 3 : 1}
          style={{ cursor: 'move' }}
          onMouseDown={(event) => onMouseDown(event, piece)}
          onDoubleClick={() => onDoubleClick(piece)}
        />
        <text
          x={length / 2}
          y={5}
          textAnchor="middle"
          fontSize="16px"
          fill={isDark ? '#0f172a' : '#facc15'}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          {`L${piece.params.length}`}
        </text>
        <circle cx={0} cy={0} r={4} {...connectionPointProps('start')} />
        <circle cx={length} cy={0} r={4} {...connectionPointProps('end')} />
      </g>
    )
  }

  if (piece.type === 'curve') {
    const centerRadius = piece.params.radius * 2
    const trackWidth = 45 * 2
    const angleRad = (piece.params.angle * Math.PI) / 180
    const centerX1 = centerRadius
    const centerY1 = 0
    const centerX2 = centerRadius * Math.cos(angleRad)
    const centerY2 = centerRadius * Math.sin(angleRad)
    const largeArcFlag = piece.params.angle > 180 ? 1 : 0
    const innerRadius = centerRadius - trackWidth / 2
    const outerRadius = centerRadius + trackWidth / 2
    const path = [
      `M ${innerRadius} 0`,
      `L ${outerRadius} 0`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerRadius * Math.cos(angleRad)} ${outerRadius * Math.sin(angleRad)}`,
      `L ${innerRadius * Math.cos(angleRad)} ${innerRadius * Math.sin(angleRad)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerRadius} 0`,
    ].join(' ')

    return (
      <g data-piece-id={piece.id} transform={`translate(${piece.x}, ${piece.y}) rotate(${piece.rotation || 0})`}>
        <path
          d={path}
          fill={isDark ? '#e5e7eb' : '#111827'}
          stroke={isSelected ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
          strokeWidth={isSelected ? 3 : 1}
          style={{ cursor: 'move' }}
          onMouseDown={(event) => onMouseDown(event, piece)}
          onDoubleClick={() => onDoubleClick(piece)}
        />
        <circle cx={0} cy={0} r={3} fill="#00ff00" stroke="#000" strokeWidth={1} />
        <text
          x={centerRadius * Math.cos(angleRad / 2)}
          y={centerRadius * Math.sin(angleRad / 2)}
          textAnchor="middle"
          fontSize="16px"
          fill={isDark ? '#0f172a' : '#facc15'}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          {`R${piece.params.radius}-${piece.params.angle}`}
        </text>
        <circle cx={centerX1} cy={centerY1} r={4} {...connectionPointProps('start')} />
        <circle cx={centerX2} cy={centerY2} r={4} {...connectionPointProps('end')} />
      </g>
    )
  }

  return null
}

export function TrackPiecesLayer(props: TrackPiecesLayerProps) {
  const pieceIds = usePvcEditorStore((state) => state.pieceIds)

  return pieceIds.map((pieceId) => (
    <TrackPieceView
      key={pieceId}
      {...props}
      pieceId={pieceId}
      isSelected={pieceId === props.selectedId || props.selectedIds.has(pieceId)}
    />
  ))
}
