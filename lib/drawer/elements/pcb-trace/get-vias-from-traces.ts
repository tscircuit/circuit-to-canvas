import type { AnyCircuitElement, PcbBoard, PcbVia } from "circuit-json"
import type { AnyCircuitJsonId } from "../../create-board-owner-map"

export function getViasFromTraces(
  elements: AnyCircuitElement[],
  boardOwnerMap: Map<AnyCircuitJsonId, PcbBoard | undefined>,
  contextElements: AnyCircuitElement[] = [],
): PcbVia[] {
  const allElements = [...elements, ...contextElements]
  const viaPositions = new Set(
    allElements
      .filter((element): element is PcbVia => element.type === "pcb_via")
      .map((via) => `${via.x}:${via.y}`),
  )
  const vias: PcbVia[] = []

  for (const element of elements) {
    if (element.type !== "pcb_trace") continue
    for (const [index, point] of element.route.entries()) {
      if (point.route_type !== "via") continue
      const position = `${point.x}:${point.y}`
      if (viaPositions.has(position)) continue
      viaPositions.add(position)

      const board = boardOwnerMap.get(element.pcb_trace_id)
      vias.push({
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
      })
    }
  }

  return vias
}
