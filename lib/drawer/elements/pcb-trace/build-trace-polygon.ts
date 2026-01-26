import type { PcbTraceRoutePointWire } from "circuit-json"
import { getDirectionAt } from "./get-direction-at"
import { normalizeVector } from "./normalize-vector"

export function buildTracePolygon(
  points: PcbTraceRoutePointWire[],
): Array<{ x: number; y: number }> {
  const left: Array<{ x: number; y: number }> = []
  const right: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const dir = getDirectionAt(points, i)
    const normal = normalizeVector(-dir.y, dir.x)
    const offset = point.width / 2

    left.push({
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset,
    })
    right.push({
      x: point.x - normal.x * offset,
      y: point.y - normal.y * offset,
    })
  }

  return left.concat(right.reverse())
}
