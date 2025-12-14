import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbNoteLine } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb note line with custom color", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const line: PcbNoteLine = {
    type: "pcb_note_line",
    pcb_note_line_id: "note_line3",
    x1: 10,
    y1: 50,
    x2: 90,
    y2: 50,
    stroke_width: 2,
    color: "#FF0000", // Red color
  }

  drawer.drawElements([line])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
