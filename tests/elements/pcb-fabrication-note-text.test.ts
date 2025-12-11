import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note text", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })

  const text: PcbFabricationNoteText = {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "text1",
    pcb_component_id: "component1",
    layer: "top",
    text: "FAB NOTE",
    anchor_position: { x: 50, y: 50 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 8,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
