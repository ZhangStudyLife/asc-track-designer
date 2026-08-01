import React from 'react'

type TrackCanvasProps = {
  svgRef: React.RefObject<SVGSVGElement>
  viewBox: { x: number; y: number; width: number; height: number }
  cursor: string
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void
  onContextMenu: (e: React.MouseEvent<SVGSVGElement>) => void
  children?: React.ReactNode
}

export function TrackCanvas({
  svgRef,
  viewBox,
  cursor,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
  children,
}: TrackCanvasProps) {
  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      style={{ cursor }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
    >
      {children}
    </svg>
  )
}
