import type { AnyCircuitElement, PcbVia } from "circuit-json"
import type { CanvasContext } from "../../types"

type ViaPositionKey = string

export function getViasFromTraces(
  elements: AnyCircuitElement[],
  ctx: CanvasContext,
  contextElements: AnyCircuitElement[] = [],
): PcbVia[] {
  const allElements = [...elements, ...contextElements]
  const viasByPosition = new Map<ViaPositionKey, PcbVia[]>()
  for (const element of allElements) {
    if (element.type !== "pcb_via") continue
    const board = ctx.boardOwnerMap?.get(element.pcb_via_id)
    const position = `${board?.pcb_board_id ?? ""}:${element.x}:${element.y}`
    const existingVias = viasByPosition.get(position) ?? []
    existingVias.push(element)
    viasByPosition.set(position, existingVias)
  }
  const vias: PcbVia[] = []

  for (const element of elements) {
    if (element.type !== "pcb_trace") continue
    const board = ctx.boardOwnerMap?.get(element.pcb_trace_id)
    for (const [index, point] of element.route.entries()) {
      if (point.route_type !== "via") continue
      const position = `${board?.pcb_board_id ?? ""}:${point.x}:${point.y}`
      const existingVias = viasByPosition.get(position) ?? []
      if (
        existingVias.some(
          (via) =>
            via.layers.includes(point.from_layer) &&
            via.layers.includes(point.to_layer),
        )
      ) {
        continue
      }

      const via: PcbVia = {
        type: "pcb_via",
        pcb_via_id: `${element.pcb_trace_id}_route_via_${index}`,
        pcb_trace_id: element.pcb_trace_id,
        subcircuit_id: element.subcircuit_id,
        pcb_group_id: element.pcb_group_id,
        x: point.x,
        y: point.y,
        layers: [point.from_layer, point.to_layer],
        hole_diameter:
          point.hole_diameter ?? board?.min_via_hole_diameter ?? 0.25,
        outer_diameter:
          point.outer_diameter ?? board?.min_via_pad_diameter ?? 0.6,
        tented_on_top: point.tented_on_top,
        tented_on_bottom: point.tented_on_bottom,
      }
      vias.push(via)
      existingVias.push(via)
      viasByPosition.set(position, existingVias)
    }
  }

  return vias
}
