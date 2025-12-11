import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { PcbFabricationNoteDimension } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw fabrication note dimension", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 20, y: 50 },
    to: { x: 80, y: 50 },
    text: "60mm",
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("draw fabrication note dimension vertical", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 50, y: 20 },
    to: { x: 50, y: 80 },
    text: "60mm",
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-dimension-vertical",
  )
})

test("draw fabrication note dimension with offset", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 20, y: 50 },
    to: { x: 80, y: 50 },
    text: "60mm",
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
    offset_distance: 10,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-dimension-offset",
  )
})

test("draw fabrication note dimension diagonal", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 20, y: 20 },
    to: { x: 80, y: 80 },
    text: "84.85mm",
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-dimension-diagonal",
  )
})

test("draw fabrication note dimension without text", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const dimension: PcbFabricationNoteDimension = {
    type: "pcb_fabrication_note_dimension",
    pcb_fabrication_note_dimension_id: "dim1",
    pcb_component_id: "component1",
    layer: "top",
    from: { x: 20, y: 50 },
    to: { x: 80, y: 50 },
    font: "tscircuit2024",
    font_size: 6,
    arrow_size: 3,
  }

  drawer.drawElements([dimension])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-note-dimension-no-text",
  )
})
