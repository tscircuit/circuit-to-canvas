import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw text with baseline alignment and descenders", async () => {
  const SCALE = 4
  const canvas = createCanvas(200 * SCALE, 150 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  // Draw baseline reference line
  ctx.strokeStyle = "#444444"
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(10, 75)
  ctx.lineTo(190, 75)
  ctx.stroke()

  // Test text with lowercase letters and descenders (g, j, p, q, y)
  const text: PcbFabricationNoteText = {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab-note-baseline",
    pcb_component_id: "component1",
    layer: "top",
    text: "gap jqpy",
    anchor_position: { x: 100, y: 75 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 20,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-text-baseline",
  )
})
