import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export type AnyCircuitJsonId = string

export function createBoardOwnerMap(circuitJson: AnyCircuitElement[]) {
  const boardOwnerMap = new Map<AnyCircuitJsonId, PcbBoard | undefined>()
  const parentById = new Map<AnyCircuitJsonId, AnyCircuitJsonId | undefined>()
  const boardsById = new Map<AnyCircuitJsonId, PcbBoard>()

  for (const element of circuitJson) {
    switch (element.type) {
      case "pcb_board":
        boardsById.set(element.pcb_board_id, element)
        break
      case "source_group":
        parentById.set(
          element.source_group_id,
          element.subcircuit_id ??
            element.parent_subcircuit_id ??
            element.parent_source_group_id,
        )
        if (element.is_subcircuit && element.subcircuit_id) {
          parentById.set(
            element.subcircuit_id,
            element.parent_subcircuit_id ?? element.parent_source_group_id,
          )
        }
        break
      case "pcb_group":
        parentById.set(
          element.pcb_group_id,
          element.subcircuit_id ?? element.source_group_id,
        )
        break
      case "pcb_component":
        parentById.set(
          element.pcb_component_id,
          element.subcircuit_id ?? element.pcb_group_id,
        )
        break
      case "pcb_trace":
        parentById.set(
          element.pcb_trace_id,
          element.subcircuit_id ??
            element.pcb_group_id ??
            element.pcb_component_id,
        )
        break
      case "pcb_via":
        parentById.set(
          element.pcb_via_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_trace_id,
        )
        break
    }
  }

  for (const board of boardsById.values()) {
    boardOwnerMap.set(board.pcb_board_id, board)
    if (board.subcircuit_id) boardOwnerMap.set(board.subcircuit_id, board)
  }

  const defaultBoard =
    boardsById.size === 1 ? boardsById.values().next().value : undefined
  const resolving = new Set<AnyCircuitJsonId>()
  function resolveBoard(id: AnyCircuitJsonId): PcbBoard | undefined {
    if (boardOwnerMap.has(id)) return boardOwnerMap.get(id)
    if (resolving.has(id) || !parentById.has(id)) return undefined
    resolving.add(id)
    const parentId = parentById.get(id)
    const board = parentId ? resolveBoard(parentId) : defaultBoard
    boardOwnerMap.set(id, board)
    resolving.delete(id)
    return board
  }

  for (const id of parentById.keys()) resolveBoard(id)
  return boardOwnerMap
}
