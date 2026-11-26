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
      if (!isWireAt(previous, point.start, point.start_layer)) {
        extended.push(wireEndpoint(point.start, point.start_layer, point.width))
      }
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

    if (!isWireAt(extended.at(-1), end, incomingLayer)) {
      extended.push(wireEndpoint(end, incomingLayer, width))
    }
    extended.push(point)
    if (!isWireAt(next, end, outgoingLayer)) {
      const nextWidth =
        next !== undefined && next.route_type !== "via" ? next.width : width
      extended.push(wireEndpoint(end, outgoingLayer, nextWidth))
    }
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
  point: Route[number] | undefined,
  position: Point,
  layer: LayerRef,
): boolean {
  return (
    point !== undefined &&
    point.route_type === "wire" &&
    point.layer === layer &&
    point.x === position.x &&
    point.y === position.y
  )
}

function wireEndpoint(
  { x, y }: Point,
  layer: LayerRef,
  width: number,
): PcbTraceRoutePointWire {
  return { route_type: "wire", x, y, layer, width }
}
