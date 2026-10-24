import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("varying-width bends intersect the actual sloping trace edges", () => {
  const route: PcbTraceRoutePointWire[] = [
    { route_type: "wire", x: 0, y: 0, width: 2, layer: "top" },
    { route_type: "wire", x: 4, y: 0, width: 4, layer: "top" },
    { route_type: "wire", x: 4, y: 4, width: 6, layer: "top" },
  ]
  const original = structuredClone(route)
  const polygon = buildTracePolygon(route)
  // Left edges: y=1+x/4 and x=2-y/4. Right edges: y=-1-x/4 and x=6+y/4.
  const expected = [
    { x: 0, y: 1 },
    { x: 28 / 17, y: 24 / 17 },
    { x: 1, y: 4 },
    { x: 7, y: 4 },
    { x: 92 / 17, y: -40 / 17 },
    { x: 0, y: -1 },
  ]
  expect(polygon).toHaveLength(expected.length)
  for (const [index, point] of expected.entries()) {
    expect(polygon[index]!.x).toBeCloseTo(point.x)
    expect(polygon[index]!.y).toBeCloseTo(point.y)
  }
  expect(route).toEqual(original)
})
