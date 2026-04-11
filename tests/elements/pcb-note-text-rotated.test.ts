import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbNoteText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note text with rotation", async () => {
  const canvas = createCanvas(140, 140)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 140, 140)

  const text: PcbNoteText = {
    type: "pcb_note_text",
    pcb_note_text_id: "note-rotated",
    text: "ROT45",
    anchor_position: { x: 70, y: 70 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 10,
    ccw_rotation: 45,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
