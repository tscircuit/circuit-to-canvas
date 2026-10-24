import type { PcbTraceRoutePointWire } from "circuit-json"
import { normalizeTraceDirection } from "./normalize-trace-direction"

/** Intersect the incoming and outgoing offset edges, extended past their endpoints. */
export function getTraceEdgeIntersection({
  previous,
  point,
  next,
  side,
}: {
  previous: PcbTraceRoutePointWire
  point: PcbTraceRoutePointWire
  next: PcbTraceRoutePointWire
  side: number
}): { x: number; y: number } | null {
  const incoming = normalizeTraceDirection(
    point.x - previous.x,
    point.y - previous.y,
  )
  const outgoing = normalizeTraceDirection(next.x - point.x, next.y - point.y)
  if (
    (incoming.x === 0 && incoming.y === 0) ||
    (outgoing.x === 0 && outgoing.y === 0)
  )
    return null
  const a = {
    x: previous.x - ((incoming.y * previous.width) / 2) * side,
    y: previous.y + ((incoming.x * previous.width) / 2) * side,
  }
  const b = {
    x: point.x - ((incoming.y * point.width) / 2) * side,
    y: point.y + ((incoming.x * point.width) / 2) * side,
  }
  const c = {
    x: point.x - ((outgoing.y * point.width) / 2) * side,
    y: point.y + ((outgoing.x * point.width) / 2) * side,
  }
  const d = {
    x: next.x - ((outgoing.y * next.width) / 2) * side,
    y: next.y + ((outgoing.x * next.width) / 2) * side,
  }
  const incomingEdge = { x: b.x - a.x, y: b.y - a.y }
  const outgoingEdge = { x: d.x - c.x, y: d.y - c.y }
  const determinant =
    incomingEdge.x * outgoingEdge.y - incomingEdge.y * outgoingEdge.x
  // Parallel, reversing, and coincident edges have no unique intersection.
  if (determinant === 0) return null
  const alongIncoming =
    ((c.x - a.x) * outgoingEdge.y - (c.y - a.y) * outgoingEdge.x) / determinant
  return {
    x: a.x + alongIncoming * incomingEdge.x,
    y: a.y + alongIncoming * incomingEdge.y,
  }
}
