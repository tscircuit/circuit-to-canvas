import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import circuitJson from "./assets/copper-pour-same-net-trace-partially-covered.json"

function render(elements: AnyCircuitElement[]): Buffer {
  const canvas = createCanvas(300, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 300, 200)

  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(elements, { clipTracesInsideSameNetPours: true })

  return canvas.toBuffer("image/png")
}

test("clipTracesInsideSameNetPours hides trace portions inside same-net pours", async () => {
  const png = render(circuitJson as AnyCircuitElement[])
  await expect(png).toMatchPngSnapshot(import.meta.path)
})
