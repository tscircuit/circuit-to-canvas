import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("pcb_component bounding box visualization shows component rectangles", async () => {
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 600)

  drawer.configure({
    colorOverrides: {
      debugComponent: {
        fill: "rgba(255, 0, 0, 0.2)",
        stroke: "red",
      },
    },
  })

  drawer.setCameraBounds({ minX: -30, maxX: 30, minY: -20, maxY: 20 })

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 50,
      height: 40,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Component 1: Small component at origin
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: -15, y: 10 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    // Component 2: Larger component with rotation
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: 10, y: -8 },
      width: 8,
      height: 5,
      layer: "top",
      obstructs_within_bounds: true,
      rotation: 45,
    },
    // Component 3: Rectangular component
    {
      type: "pcb_component",
      pcb_component_id: "comp_3",
      source_component_id: "source_3",
      center: { x: -8, y: -12 },
      width: 6,
      height: 3,
      layer: "top",
      rotation: 90,
      obstructs_within_bounds: true,
    },
    // Component 4: Bottom layer component
    {
      type: "pcb_component",
      pcb_component_id: "comp_4",
      source_component_id: "source_4",
      center: { x: 15, y: 10 },
      width: 5,
      height: 5,
      layer: "bottom",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    // Component 5: Component with 180 degree rotation
    {
      type: "pcb_component",
      pcb_component_id: "comp_5",
      source_component_id: "source_5",
      center: { x: -5, y: 5 },
      width: 3,
      height: 7,
      layer: "top",
      rotation: 180,
      obstructs_within_bounds: true,
    },
  ]

  drawer.drawElements(circuitJson)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("pcb_component bounding box visualization respects fill and stroke separately", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  drawer.configure({
    colorOverrides: {
      debugComponent: {
        fill: "rgba(0, 0, 255, 0.3)",
        stroke: "blue",
      },
    },
  })

  drawer.setCameraBounds({ minX: -15, maxX: 15, minY: -15, maxY: 15 })

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    // Component with only fill
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: -8, y: 0 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    // Component with only stroke
    {
      type: "pcb_component",
      pcb_component_id: "comp_2",
      source_component_id: "source_2",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
    // Component with both fill and stroke
    {
      type: "pcb_component",
      pcb_component_id: "comp_3",
      source_component_id: "source_3",
      center: { x: 8, y: 0 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
  ]

  drawer.drawElements(circuitJson)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path + "fill-stroke",
  )
})

test("pcb_component bounding box not shown when debugComponent colors are null", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  // No configure call - should not show bounding boxes (default is null)

  drawer.setCameraBounds({ minX: -15, maxX: 15, minY: -15, maxY: 15 })

  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      center: { x: 0, y: 0 },
      width: 30,
      height: 30,
      num_layers: 2,
      material: "fr4",
      thickness: 1.6,
    },
    {
      type: "pcb_component",
      pcb_component_id: "comp_1",
      source_component_id: "source_1",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      layer: "top",
      rotation: 0,
      obstructs_within_bounds: true,
    },
  ]

  drawer.drawElements(circuitJson)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path + "no-debug",
  )
})
