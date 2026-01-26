import type { PcbTraceRoutePointWire } from "circuit-json"

export function hasVariableWidth(points: PcbTraceRoutePointWire[]): boolean {
  if (points.length < 2) return false
  const baseWidth = points[0]?.width
  if (typeof baseWidth !== "number") return false
  return points.some(
    (point) => Math.abs(point.width - baseWidth) > Number.EPSILON,
  )
}
