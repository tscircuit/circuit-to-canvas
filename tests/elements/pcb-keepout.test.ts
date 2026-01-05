import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PCBKeepout } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw keepout shapes", async () => {
  const SCALE = 8
  const canvas = createCanvas(200 * SCALE, 100 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  const keepouts: PCBKeepout[] = [
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout1",
      shape: "rect",
      center: { x: 50, y: 50 },
      width: 30,
      height: 20,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_keepout",
      pcb_keepout_id: "keepout2",
      shape: "circle",
      center: { x: 150, y: 50 },
      radius: 20,
      layers: ["top", "bottom"],
    },
  ]

  drawer.drawElements(keepouts)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
