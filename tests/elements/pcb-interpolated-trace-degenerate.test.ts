import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("interpolated trace intersections keep empty, straight, repeated and reversing routes finite", () => {
  const point: PcbTraceRoutePointWire = {
    route_type: "wire",
    x: 0,
    y: 0,
    width: 2,
    layer: "top",
  }
  for (const { route, vertexCount } of [
    { route: [], vertexCount: 0 },
    { route: [point], vertexCount: 2 },
    { route: [point, point], vertexCount: 4 },
    { route: [point, point, { ...point, x: 4 }], vertexCount: 6 },
    { route: [point, { ...point, x: 4 }, point], vertexCount: 8 },
    {
      route: [point, { ...point, x: 4 }, { ...point, x: 8, width: 4 }],
      vertexCount: 6,
    },
  ]) {
    const original = structuredClone(route)
    const polygon = buildTracePolygon(route)
    // A reversing join has separate incoming and outgoing offset vertices.
    expect(polygon).toHaveLength(vertexCount)
    expect(
      polygon.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true)
    expect(route).toEqual(original)
  }
})
