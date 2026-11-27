import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbTraceRoutePointWire } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("short tapered bends keep copper when the inside edges extend beyond adjacent end caps", () => {
  for (const y of [-0.1, 0.1]) {
    const route: PcbTraceRoutePointWire[] = [
      { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
      { route_type: "wire", x: 0.1, y: 0, width: 2, layer: "top" },
      { route_type: "wire", x: 0.1, y, width: 0.2, layer: "top" },
    ]
    for (const points of [route, [...route].reverse()]) {
      const canvas = createCanvas(400, 400)
      const ctx = canvas.getContext("2d")
      const drawer = new CircuitToCanvasDrawer(ctx)
      drawer.setCameraBounds({ minX: -1, maxX: 1, minY: -1, maxY: 1 })
      drawer.drawElements([
        {
          type: "pcb_trace",
          pcb_trace_id: "short-taper",
          route_thickness_mode: "interpolated",
          route: points,
        },
      ])
      const turn = Math.sign(y)
      // At these cross-sections each arm is 1.82mm wide: 0.8mm is inside its copper.
      for (const point of [
        { x: 0.09, y: turn * 0.8 },
        { x: 0.1 - turn * 0.8, y: y / 10 },
      ]) {
        const pixel = applyToPoint(drawer.realToCanvasMat, point)
        expect(
          ctx.getImageData(Math.floor(pixel.x), Math.floor(pixel.y), 1, 1)
            .data[3],
        ).toBe(255)
      }
    }
  }
})
