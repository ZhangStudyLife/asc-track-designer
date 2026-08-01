import type { TrackPiece } from '../domain/types'

type PieceChange = {
  id: number
  before?: TrackPiece
  after?: TrackPiece
}

type HistoryCommand = {
  beforeOrder: number[]
  afterOrder: number[]
  changes: PieceChange[]
}

const HISTORY_LIMIT = 100
let undoStack: HistoryCommand[] = []
let redoStack: HistoryCommand[] = []

function piecesEqual(left?: TrackPiece, right?: TrackPiece) {
  return left === right || JSON.stringify(left) === JSON.stringify(right)
}

function createCommand(before: TrackPiece[], after: TrackPiece[]): HistoryCommand | null {
  const beforeById = new Map(before.map((piece) => [piece.id, piece]))
  const afterById = new Map(after.map((piece) => [piece.id, piece]))
  const ids = new Set([...beforeById.keys(), ...afterById.keys()])
  const changes: PieceChange[] = []

  for (const id of ids) {
    const previous = beforeById.get(id)
    const next = afterById.get(id)
    if (!piecesEqual(previous, next)) changes.push({ id, before: previous, after: next })
  }

  const beforeOrder = before.map((piece) => piece.id)
  const afterOrder = after.map((piece) => piece.id)
  if (changes.length === 0 && beforeOrder.every((id, index) => id === afterOrder[index])) return null

  return { beforeOrder, afterOrder, changes }
}

function applyCommand(current: TrackPiece[], command: HistoryCommand, direction: 'before' | 'after') {
  const piecesById = new Map(current.map((piece) => [piece.id, piece]))

  for (const change of command.changes) {
    const piece = change[direction]
    if (piece) {
      piecesById.set(change.id, piece)
    } else {
      piecesById.delete(change.id)
    }
  }

  const order = direction === 'before' ? command.beforeOrder : command.afterOrder
  return order.map((id) => piecesById.get(id)).filter((piece): piece is TrackPiece => Boolean(piece))
}

function pushUndo(command: HistoryCommand) {
  undoStack = [...undoStack, command].slice(-HISTORY_LIMIT)
}

export function recordHistoryCommand(before: TrackPiece[], after: TrackPiece[]) {
  const command = createCommand(before, after)
  if (!command) return false

  pushUndo(command)
  redoStack = []
  return true
}

export function hydrateHistoryCommands(snapshots: TrackPiece[][]) {
  undoStack = []
  redoStack = []

  for (let index = 1; index < snapshots.length; index += 1) {
    const command = createCommand(snapshots[index - 1], snapshots[index])
    if (command) pushUndo(command)
  }
}

export function undoHistoryCommand(current: TrackPiece[]) {
  const command = undoStack.pop()
  if (!command) return null

  redoStack.push(command)
  return applyCommand(current, command, 'before')
}

export function redoHistoryCommand(current: TrackPiece[]) {
  const command = redoStack.pop()
  if (!command) return null

  pushUndo(command)
  return applyCommand(current, command, 'after')
}

export function resetHistoryCommands() {
  undoStack = []
  redoStack = []
}
