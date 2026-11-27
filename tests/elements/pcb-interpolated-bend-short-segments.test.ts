import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { compose, scale, translate } from "transformation-matrix"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("overlapping short interpolated segments match native bevel joins without losing copper", () => {
  for (const y of [-0.1, 0.1]) {
    const route: PcbTraceRoutePointWire[] = [
      { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 0.1, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 0.1, y, width: 1, layer: "top" },
    ]
    for (const points of [route, [...route].reverse()]) {
      const polygon = buildTracePolygon(points)
      const actual = createCanvas(200, 200).getContext("2d")
      const expected = createCanvas(200, 200).getContext("2d")
      // Both renderings use the same board-to-pixel mapping.
      const boardToCanvas = compose(translate(100, 100), scale(100, -100))
      for (const ctx of [actual, expected]) {
        ctx.setTransform(
          boardToCanvas.a,
          boardToCanvas.b,
          boardToCanvas.c,
          boardToCanvas.d,
          boardToCanvas.e,
          boardToCanvas.f,
        )
      }
      actual.beginPath()
      actual.moveTo(polygon[0]!.x, polygon[0]!.y)
      for (const point of polygon.slice(1)) actual.lineTo(point.x, point.y)
      actual.closePath()
      actual.fill()
      expected.beginPath()
      expected.moveTo(points[0]!.x, points[0]!.y)
      for (const point of points.slice(1)) expected.lineTo(point.x, point.y)
      expected.lineWidth = 1
      expected.lineJoin = "bevel"
      expected.lineCap = "butt"
      expected.stroke()
      expect(actual.getImageData(0, 0, 200, 200).data).toEqual(
        expected.getImageData(0, 0, 200, 200).data,
      )
    }
  }
})
