import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("pcb keepout draws outline polygons and two-point segments", async () => {
  const canvas = createCanvas(2000, 1600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.setCameraBounds({ minX: -25, maxX: 25, minY: -20, maxY: 20 })

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const elements = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board_0",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      material: "fr1",
      num_layers: 2,
      thickness: 1.2,
    },
    {
      type: "pcb_keepout",
      shape: "outline",
      pcb_keepout_id: "pcb_keepout_outline_poly",
      outline: [
        { x: 2, y: -8 },
        { x: 14, y: -8 },
        { x: 14, y: 6 },
        { x: 6, y: 6 },
      ],
      stroke_width: 0.2,
      layers: ["top"],
    },
    {
      type: "pcb_keepout",
      shape: "outline",
      pcb_keepout_id: "pcb_keepout_outline_line",
      outline: [
        { x: -16, y: 10 },
        { x: -2, y: 10 },
      ],
      stroke_width: 0.6,
      layers: ["bottom"],
    },
  ] as AnyCircuitElement[]

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
