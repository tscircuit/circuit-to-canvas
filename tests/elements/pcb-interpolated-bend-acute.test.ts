import { expect, test } from "bun:test"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"

test("acute interpolated bends retain copper without extending spikes beyond the route", () => {
  for (const y of [-0.01, 0, 0.01]) {
    const route: PcbTraceRoutePointWire[] = [
      { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 4, y: 0, width: 1, layer: "top" },
      { route_type: "wire", x: 0, y, width: 1, layer: "top" },
    ]
    for (const points of [route, [...route].reverse()]) {
      const polygon = buildTracePolygon(points)
      // Bevels and finite intersections stay within the route's half-width bounds.
      for (const point of polygon) {
        expect(point.x).toBeGreaterThanOrEqual(-0.5)
        expect(point.x).toBeLessThanOrEqual(4.5)
        expect(point.y).toBeGreaterThanOrEqual(Math.min(0, y) - 0.5)
        expect(point.y).toBeLessThanOrEqual(Math.max(0, y) + 0.5)
      }
      const canvas = createCanvas(600, 200)
      const ctx = canvas.getContext("2d")
      const drawer = new CircuitToCanvasDrawer(ctx)
      drawer.setCameraBounds({ minX: -1, maxX: 5, minY: -1, maxY: 1 })
      drawer.drawElements([
        {
          type: "pcb_trace",
          pcb_trace_id: "acute",
          route_thickness_mode: "interpolated",
          route: points,
        },
      ])
      // Inside both arms is copper; the former miter spike remains empty.
      for (const { x, y: sampleY, alpha } of [
        { x: 2, y: 0.4, alpha: 255 },
        { x: 2, y: -0.4, alpha: 255 },
        { x: -0.75, y: 0.4, alpha: 0 },
        { x: 4.75, y: -0.4, alpha: 0 },
      ]) {
        const pixel = applyToPoint(drawer.realToCanvasMat, { x, y: sampleY })
        expect(
          ctx.getImageData(Math.floor(pixel.x), Math.floor(pixel.y), 1, 1)
            .data[3],
        ).toBe(alpha)
      }
    }
  }
})
