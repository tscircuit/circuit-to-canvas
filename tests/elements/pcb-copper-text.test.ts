import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbCopperText } from "circuit-json"
import { scale } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw copper text", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const text: PcbCopperText = {
    type: "pcb_copper_text",
    pcb_copper_text_id: "copper-text-1",
    pcb_component_id: "component1",
    layer: "top",
    text: "T1",
    anchor_position: { x: 40, y: 40 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 8,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-copper-text",
  )
})

test("draw copper text knockout mirrored with padding", async () => {
  const canvas = createCanvas(100, 60)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.antialias = "none"
  ctx.patternQuality = "nearest"
  ctx.quality = "nearest"

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawer.realToCanvasMat = scale(2, 2)

  const text: PcbCopperText = {
    type: "pcb_copper_text",
    pcb_copper_text_id: "copper-text-2",
    pcb_component_id: "component1",
    layer: "bottom",
    text: "KO",
    anchor_position: { x: 25, y: 15 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 10,
    is_knockout: true,
    is_mirrored: true,
  }

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-copper-text-knockout",
  )
})
