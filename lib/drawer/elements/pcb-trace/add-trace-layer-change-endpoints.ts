import type {
  LayerRef,
  PcbTrace,
  PcbTraceRoutePointWire,
  Point,
} from "circuit-json"

type Route = PcbTrace["route"]

/** Supplies the wire endpoints implicit in via and through-pad route points. */
export function addTraceLayerChangeEndpoints(route: Route): Route {
  const firstPointWithWidth = route.find((point) => point.route_type !== "via")
  if (firstPointWithWidth === undefined) return route

  const extended: Route = []
  let width = firstPointWithWidth.width
  for (const [index, point] of route.entries()) {
    if (point.route_type === "wire") {
      extended.push(point)
      width = point.width
      continue
    }

    const previous = extended.at(-1)
    const next = route[index + 1]
    if (point.route_type === "through_pad") {
      const start = wireEndpoint({
        position: point.start,
        layer: point.start_layer,
        width: point.width,
      })
      if (previous === undefined || !isWireAt(previous, start))
        extended.push(start)
      width = point.width
    }

    const end = point.route_type === "through_pad" ? point.end : point
    const fromLayer =
      point.route_type === "through_pad" ? point.start_layer : point.from_layer
    const toLayer =
      point.route_type === "through_pad" ? point.end_layer : point.to_layer
    const reversed =
      point.route_type === "via" &&
      (previous !== undefined && previous.route_type === "wire"
        ? previous.layer === toLayer
        : next !== undefined && !hasRoutePointLayer(next, toLayer))
    const incomingLayer = reversed ? toLayer : fromLayer
    const outgoingLayer = reversed ? fromLayer : toLayer

    const incoming = wireEndpoint({
      position: end,
      layer: incomingLayer,
      width,
    })
    const previousWire = extended.at(-1)
    if (previousWire === undefined || !isWireAt(previousWire, incoming))
      extended.push(incoming)
    extended.push(point)
    const nextWidth =
      next !== undefined && next.route_type !== "via" ? next.width : width
    const outgoing = wireEndpoint({
      position: end,
      layer: outgoingLayer,
      width: nextWidth,
    })
    if (next === undefined || !isWireAt(next, outgoing)) extended.push(outgoing)
  }
  return extended
}

function hasRoutePointLayer(point: Route[number], layer: LayerRef): boolean {
  switch (point.route_type) {
    case "wire":
      return point.layer === layer
    case "via":
      return point.from_layer === layer || point.to_layer === layer
    case "through_pad":
      return point.start_layer === layer
  }
}

function isWireAt(
  point: Route[number],
  endpoint: PcbTraceRoutePointWire,
): boolean {
  return (
    point.route_type === "wire" &&
    point.layer === endpoint.layer &&
    point.x === endpoint.x &&
    point.y === endpoint.y
  )
}

function wireEndpoint({
  position: { x, y },
  layer,
  width,
}: {
  position: Point
  layer: LayerRef
  width: number
}): PcbTraceRoutePointWire {
  return { route_type: "wire", x, y, layer, width }
}
