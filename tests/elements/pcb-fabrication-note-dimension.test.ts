import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbFabricationNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw pcb fabrication note dimension - basic", async () => {
  const width = 200
  const height = 100
  const dpr = 2
  const canvas = createCanvas(width * dpr, height * dpr)
  const ctx = canvas.getContext("2d")
  ctx.scale(dpr, dpr)
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  const circuitjson: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "fab_dim_1",
    from: { x: 20, y: 50 },
    to: { x: 180, y: 50 },
    arrow_size: 4,
    font_size: 6,
    text: "160mm",
    layer: "top",
    pcb_component_id: "comp_1",
    font: "tscircuit2024",
  }

  drawer.drawElements([circuitjson])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
