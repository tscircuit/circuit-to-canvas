import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note rect dashed", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })

  const rect: PcbFabricationNoteRect = {
    type: "pcb_fabrication_note_rect",
    pcb_fabrication_note_rect_id: "rect1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 50, y: 50 },
    width: 60,
    height: 40,
    stroke_width: 0.5,
    is_filled: false,
    has_stroke: true,
    is_stroke_dashed: true,
  }

  drawer.drawElements([rect])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
