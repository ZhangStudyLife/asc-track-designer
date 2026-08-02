import React from 'react'
import { usePvcEditorStore } from '../../application/editorStore'
import { TRACK_RENDER_SCALE, TRACK_WIDTH } from '../../domain/geometry'
import type { ConnectionPointRef, MeasurementPointRef, StraightCornerKind, TrackPiece } from '../../domain/types'

type TrackPiecesLayerProps = {
  selectedId: number | null
  selectedIds: ReadonlySet<number>
  isDark: boolean
  trackColor: string
  dimensionLabelColor: string
  isMeasuring: boolean
  isAutoFill: boolean
  onMouseDown: (event: React.MouseEvent, piece: TrackPiece) => void
  onDoubleClick: (piece: TrackPiece) => void
  onMeasurePointClick: (point: MeasurementPointRef) => void
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
  trackColor,
  dimensionLabelColor,
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
    pointerEvents: (isMeasuring || isAutoFill) ? 'auto' : 'none',
    style: {
      cursor: (isMeasuring || isAutoFill) ? 'crosshair' : 'not-allowed',
      opacity: (isMeasuring || isAutoFill) ? 1 : 0.5,
    },
    onMouseDown: (event: React.MouseEvent) => {
      if (isMeasuring || isAutoFill) event.stopPropagation()
    },
    onClick: isMeasuring
      ? (event: React.MouseEvent) => {
          event.stopPropagation()
          onMeasurePointClick({ kind: 'connection', pieceId: piece.id, type })
        }
      : isAutoFill
        ? (event: React.MouseEvent) => {
            event.stopPropagation()
            onAutoFillPointClick({ pieceId: piece.id, type })
          }
        : undefined,
  })

  const measurementCornerProps = (corner: StraightCornerKind) => ({
    'data-measure-kind': 'straight-corner',
    'data-corner': corner,
    r: 5,
    fill: '#38bdf8',
    stroke: '#075985',
    strokeWidth: 1.5,
    style: { cursor: 'crosshair' },
    onMouseDown: (event: React.MouseEvent) => event.stopPropagation(),
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation()
      onMeasurePointClick({ kind: 'straight-corner', pieceId: piece.id, corner })
    },
  })

  if (piece.type === 'straight') {
    const length = piece.params.length * TRACK_RENDER_SCALE
    const width = TRACK_WIDTH * TRACK_RENDER_SCALE

    return (
      <g data-piece-id={piece.id} transform={`translate(${piece.x}, ${piece.y}) rotate(${piece.rotation || 0})`}>
        <rect
          x={0}
          y={-width / 2}
          width={length}
          height={width}
          fill={trackColor}
          stroke={isSelected ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
          strokeWidth={isSelected ? 3 : 1}
          style={{ cursor: isMeasuring ? 'crosshair' : 'move' }}
          onMouseDown={(event) => onMouseDown(event, piece)}
          onDoubleClick={() => onDoubleClick(piece)}
        />
        <text
          x={length / 2}
          y={5}
          textAnchor="middle"
          fontSize="16px"
          fill={dimensionLabelColor}
          fontWeight="bold"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {`L${piece.params.length}`}
        </text>
        <circle data-connection-type="start" data-measure-kind={isMeasuring ? 'connection' : undefined} cx={0} cy={0} r={4} {...connectionPointProps('start')} />
        <circle data-connection-type="end" data-measure-kind={isMeasuring ? 'connection' : undefined} cx={length} cy={0} r={4} {...connectionPointProps('end')} />
        {isMeasuring ? <>
          <circle cx={0} cy={-width / 2} {...measurementCornerProps('start-top')} />
          <circle cx={0} cy={width / 2} {...measurementCornerProps('start-bottom')} />
          <circle cx={length} cy={-width / 2} {...measurementCornerProps('end-top')} />
          <circle cx={length} cy={width / 2} {...measurementCornerProps('end-bottom')} />
        </> : null}
      </g>
    )
  }

  if (piece.type === 'curve') {
    const centerRadius = piece.params.radius * TRACK_RENDER_SCALE
    const trackWidth = TRACK_WIDTH * TRACK_RENDER_SCALE
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
          fill={trackColor}
          stroke={isSelected ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b')}
          strokeWidth={isSelected ? 3 : 1}
          style={{ cursor: isMeasuring ? 'crosshair' : 'move' }}
          onMouseDown={(event) => onMouseDown(event, piece)}
          onDoubleClick={() => onDoubleClick(piece)}
        />
        <circle cx={0} cy={0} r={3} fill="#00ff00" stroke="#000" strokeWidth={1} pointerEvents="none" />
        <text
          x={centerRadius * Math.cos(angleRad / 2)}
          y={centerRadius * Math.sin(angleRad / 2)}
          textAnchor="middle"
          fontSize="16px"
          fill={dimensionLabelColor}
          fontWeight="bold"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {`R${piece.params.radius}-${piece.params.angle}`}
        </text>
        <circle data-connection-type="start" data-measure-kind={isMeasuring ? 'connection' : undefined} cx={centerX1} cy={centerY1} r={4} {...connectionPointProps('start')} />
        <circle data-connection-type="end" data-measure-kind={isMeasuring ? 'connection' : undefined} cx={centerX2} cy={centerY2} r={4} {...connectionPointProps('end')} />
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
