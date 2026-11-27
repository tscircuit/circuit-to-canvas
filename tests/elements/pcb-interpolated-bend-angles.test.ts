import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import {
  applyToPoint,
  compose,
  rotateDEG,
  translate,
} from "transformation-matrix"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("interpolated bends preserve inside intersections and outside bevels in either direction", () => {
  for (const ccwRotationDegrees of [-135, -90, -45, 45, 90, 135]) {
    const outgoingToBoard = compose(
      translate(4, 0),
      rotateDEG(ccwRotationDegrees),
    )
    const next = applyToPoint(outgoingToBoard, { x: 4, y: 0 })
    const route: PcbTraceRoutePointWire[] = [
      { route_type: "wire", x: 0, y: 0, width: 2, layer: "top" },
      { route_type: "wire", x: 4, y: 0, width: 2, layer: "top" },
      { route_type: "wire", ...next, width: 2, layer: "top" },
    ]
    // Inside edges meet at a unit half-width; outside edges end at the bevel.
    const extension = Math.tan((ccwRotationDegrees * Math.PI) / 360)
    const outgoingLeft = applyToPoint(outgoingToBoard, { x: 0, y: 1 })
    const outgoingRight = applyToPoint(outgoingToBoard, { x: 0, y: -1 })
    const left =
      ccwRotationDegrees > 0
        ? [{ x: 4 - extension, y: 1 }]
        : [{ x: 4, y: 1 }, outgoingLeft]
    const right =
      ccwRotationDegrees < 0
        ? [{ x: 4 + extension, y: -1 }]
        : [outgoingRight, { x: 4, y: -1 }]
    const expected = [
      { x: 0, y: 1 },
      ...left,
      applyToPoint(outgoingToBoard, { x: 4, y: 1 }),
      applyToPoint(outgoingToBoard, { x: 4, y: -1 }),
      ...right,
      { x: 0, y: -1 },
    ]
    const polygon = buildTracePolygon(route)
    expect(polygon).toHaveLength(expected.length)
    for (const [index, point] of expected.entries()) {
      expect(polygon[index]!.x).toBeCloseTo(point.x)
      expect(polygon[index]!.y).toBeCloseTo(point.y)
    }
    const reversed = buildTracePolygon([...route].reverse())
    expect(reversed).toHaveLength(polygon.length)
    for (const point of polygon) {
      expect(
        Math.min(
          ...reversed.map(({ x, y }) => Math.hypot(x - point.x, y - point.y)),
        ),
      ).toBeCloseTo(0)
    }
  }
})
