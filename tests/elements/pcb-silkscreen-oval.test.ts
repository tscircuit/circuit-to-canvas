import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenOval } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen oval", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  const oval: PcbSilkscreenOval = {
    type: "pcb_silkscreen_oval",
    pcb_silkscreen_oval_id: "oval1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 200, y: 200 },
    radius_x: 50,
    radius_y: 25,
  }

  drawer.drawElements([oval])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
