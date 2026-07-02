export type TrackPieceType = 'straight' | 'curve'

export type TrackPoint = {
  x: number
  y: number
}

export type ConnectionPointKind = 'start' | 'end'

export type ConnectionPointRef = {
  pieceId: number
  type: ConnectionPointKind
}

export type StraightTrackPiece = {
  id: number
  type: 'straight'
  x: number
  y: number
  rotation?: number
  params: {
    length: number
  }
}

export type CurveTrackPiece = {
  id: number
  type: 'curve'
  x: number
  y: number
  rotation?: number
  params: {
    radius: number
    angle: number
  }
}

export type TrackPiece = {
  id: number
  type: string
  x: number
  y: number
  rotation?: number
  params: any
}

export type ConnectionPoint = TrackPoint & {
  angle: number
  type: ConnectionPointKind
}

export type SnapResult = {
  targetX: number
  targetY: number
  distance: number
  draggedPoint: ConnectionPoint
  otherPoint: ConnectionPoint
} | null

export type TrackStats = {
  bom: Record<string, number>
  totalLength: string
  totalPieces: number
}

export type SavedTrackSizes = {
  straights: number[]
  curves: Array<{ radius: number; angle: number }>
}

export type TrackArchive = {
  name: string
  created: string
  pieces: TrackPiece[]
  viewBox: {
    x: number
    y: number
    width: number
    height: number
  }
}
