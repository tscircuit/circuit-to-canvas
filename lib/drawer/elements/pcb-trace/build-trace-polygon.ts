import type { PcbTraceRoutePointWire } from "circuit-json"
import { getTraceDirectionAt } from "./get-trace-direction-at"
import { normalizeTraceDirection } from "./normalize-trace-direction"
import { getTraceEdgeIntersection } from "./get-trace-edge-intersection"

// Builds a filled polygon representing a variable-width trace segment.
export function buildTracePolygon(
  points: PcbTraceRoutePointWire[],
): Array<{ x: number; y: number }> {
  const left: Array<{ x: number; y: number }> = []
  const right: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const previous = points[i - 1]
    const next = points[i + 1]
    for (const side of [1, -1]) {
      let vertex =
        previous && next
          ? getTraceEdgeIntersection({ previous, point, next, side })
          : null
      // Endpoints and edges without a unique intersection retain their offsets.
      if (!vertex) {
        const dir = getTraceDirectionAt(points, i)
        const normal = normalizeTraceDirection(-dir.y, dir.x)
        const offset = point.width / 2
        vertex = {
          x: point.x + normal.x * offset * side,
          y: point.y + normal.y * offset * side,
        }
      }
      if (side === 1) left.push(vertex)
      else right.push(vertex)
    }
  }

  return left.concat(right.reverse())
}
