import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNotePath } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note path", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const path: PcbFabricationNotePath = {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "path1",
    pcb_component_id: "component1",
    layer: "top",
    route: [
      { x: 20, y: 20 },
      { x: 40, y: 30 },
      { x: 60, y: 25 },
      { x: 80, y: 40 },
      { x: 80, y: 60 },
      { x: 60, y: 75 },
      { x: 40, y: 70 },
      { x: 20, y: 80 },
    ],
    stroke_width: 1,
  }

  drawer.drawElements([path])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
