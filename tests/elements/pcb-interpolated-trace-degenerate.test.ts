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
  for (const route of [
    [],
    [point],
    [point, point],
    [point, point, { ...point, x: 4 }],
    [point, { ...point, x: 4 }, point],
    [point, { ...point, x: 4 }, { ...point, x: 8, width: 4 }],
  ]) {
    const original = structuredClone(route)
    const polygon = buildTracePolygon(route)
    expect(polygon).toHaveLength(route.length * 2)
    expect(
      polygon.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true)
    expect(route).toEqual(original)
  }
})
