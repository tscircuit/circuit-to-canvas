import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw text baseline alignment with different anchor positions", async () => {
  const SCALE = 4
  const canvas = createCanvas(300 * SCALE, 200 * SCALE)
  const ctx = canvas.getContext("2d")
  ctx.scale(SCALE, SCALE)
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width / SCALE, canvas.height / SCALE)

  // Draw reference lines
  ctx.strokeStyle = "#444444"
  ctx.lineWidth = 0.5
  // Top line
  ctx.beginPath()
  ctx.moveTo(10, 50)
  ctx.lineTo(290, 50)
  ctx.stroke()
  // Center/baseline line
  ctx.beginPath()
  ctx.moveTo(10, 100)
  ctx.lineTo(290, 100)
  ctx.stroke()
  // Bottom line
  ctx.beginPath()
  ctx.moveTo(10, 150)
  ctx.lineTo(290, 150)
  ctx.stroke()

  // Test with top alignment
  const textTop: PcbFabricationNoteText = {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab-note-top",
    pcb_component_id: "component1",
    layer: "top",
    text: "gap",
    anchor_position: { x: 50, y: 50 },
    anchor_alignment: "top_left",
    font: "tscircuit2024",
    font_size: 16,
  }

  // Test with center alignment (baseline at center)
  const textCenter: PcbFabricationNoteText = {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab-note-center",
    pcb_component_id: "component2",
    layer: "top",
    text: "gap",
    anchor_position: { x: 150, y: 100 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 16,
  }

  // Test with bottom alignment
  const textBottom: PcbFabricationNoteText = {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fab-note-bottom",
    pcb_component_id: "component3",
    layer: "top",
    text: "gap",
    anchor_position: { x: 250, y: 150 },
    anchor_alignment: "bottom_left",
    font: "tscircuit2024",
    font_size: 16,
  }

  drawer.drawElements([textTop, textCenter, textBottom])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-text-baseline-anchors",
  )
})
