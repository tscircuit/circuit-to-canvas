import type { PcbTraceRoutePointWire } from "circuit-json"
import { getTraceDirectionAt } from "./get-trace-direction-at"
import { normalizeTraceDirection } from "./normalize-trace-direction"
import { getTraceEdgeJoin } from "./get-trace-edge-join"

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
      let vertices =
        previous && next
          ? getTraceEdgeJoin({ previous, point, next, side })
          : null
      // Endpoints and zero-length segments retain their existing offsets.
      if (!vertices) {
        const dir = getTraceDirectionAt(points, i)
        const normal = normalizeTraceDirection(-dir.y, dir.x)
        const offset = point.width / 2
        vertices = [
          {
            x: point.x + normal.x * offset * side,
            y: point.y + normal.y * offset * side,
          },
        ]
      }
      if (side === 1) left.push(...vertices)
      else right.push(...vertices)
    }
  }

  return left.concat(right.reverse())
}
