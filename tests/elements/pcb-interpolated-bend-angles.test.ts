import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotateDEG,
  translate,
} from "transformation-matrix"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("interpolated bend intersections preserve width for either turn direction and route reversal", () => {
  for (const ccwRotationDegrees of [-135, -90, -45, 45, 90, 135]) {
    const next = applyToPoint(
      compose(translate(4, 0), rotateDEG(ccwRotationDegrees)),
      { x: 4, y: 0 },
    )
    const route: PcbTraceRoutePointWire[] = [
      { route_type: "wire", x: 0, y: 0, width: 2, layer: "top" },
      { route_type: "wire", x: 4, y: 0, width: 2, layer: "top" },
      { route_type: "wire", ...next, width: 2, layer: "top" },
    ]
    const polygon = buildTracePolygon(route)
    // A unit half-width miter extends tan(turn/2) along the incoming edge.
    const extension = Math.tan((ccwRotationDegrees * Math.PI) / 360)
    expect(polygon[1]!.x).toBeCloseTo(4 - extension)
    expect(polygon[1]!.y).toBeCloseTo(1)
    expect(polygon[4]!.x).toBeCloseTo(4 + extension)
    expect(polygon[4]!.y).toBeCloseTo(-1)
    const reversed = buildTracePolygon([...route].reverse())
    expect(reversed[1]!.x).toBeCloseTo(polygon[4]!.x)
    expect(reversed[1]!.y).toBeCloseTo(polygon[4]!.y)
    expect(reversed[4]!.x).toBeCloseTo(polygon[1]!.x)
    expect(reversed[4]!.y).toBeCloseTo(polygon[1]!.y)
  }
})
