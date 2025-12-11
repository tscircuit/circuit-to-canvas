import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note text", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

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

test("draw fabrication note text with different alignments", async () => {
  const canvas = createCanvas(150, 150)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 150, 150)

  const elements: PcbFabricationNoteText[] = [
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "text1",
      pcb_component_id: "component1",
      layer: "top",
      text: "TL",
      anchor_position: { x: 30, y: 30 },
      anchor_alignment: "top_left",
      font: "tscircuit2024",
      font_size: 6,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "text2",
      pcb_component_id: "component1",
      layer: "top",
      text: "TR",
      anchor_position: { x: 120, y: 30 },
      anchor_alignment: "top_right",
      font: "tscircuit2024",
      font_size: 6,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "text3",
      pcb_component_id: "component1",
      layer: "top",
      text: "BL",
      anchor_position: { x: 30, y: 120 },
      anchor_alignment: "bottom_left",
      font: "tscircuit2024",
      font_size: 6,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "text4",
      pcb_component_id: "component1",
      layer: "top",
      text: "BR",
      anchor_position: { x: 120, y: 120 },
      anchor_alignment: "bottom_right",
      font: "tscircuit2024",
      font_size: 6,
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "text5",
      pcb_component_id: "component1",
      layer: "top",
      text: "CENTER",
      anchor_position: { x: 75, y: 75 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 6,
    },
  ]

  drawer.drawElements(elements)
})
