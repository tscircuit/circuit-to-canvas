import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note dimension with all features", async () => {
  const canvas = createCanvas(800, 800)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 800)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim_all",
    pcb_component_id: "component1",
    pcb_group_id: "group1",
    subcircuit_id: "subcircuit1",
    layer: "top",
    from: { x: 20, y: 50 },
    to: { x: 80, y: 50 },
    text: "60mm",
    text_ccw_rotation: 0,
    offset: 5,
    offset_distance: 10,
    offset_direction: { x: 0, y: -1 },
    font: "tscircuit2024",
    font_size: 3,
    color: "#00FFFF",
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
