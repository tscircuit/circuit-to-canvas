import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note dimension diagonal", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 20, y: 20 },
    to: { x: 80, y: 80 },
    text: "84.85mm",
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
