import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbFabricationNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note dimension with all features", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    pcb_group_id: "group1",
    subcircuit_id: "subcircuit1",
    layer: "top",
    from: { x: 80, y: 200 },
    to: { x: 320, y: 200 },
    text: "60mm",
    text_ccw_rotation: 0,
    offset_distance: 40,
    offset_direction: { x: 0, y: 1 },
    font: "tscircuit2024",
    font_size: 20,
    color: "#00FFFF",
    arrow_size: 12,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
