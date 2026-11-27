import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCourtyardPolygon } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw courtyard polygon", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const polygonTop: PcbCourtyardPolygon = {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard_polygon_top",
    pcb_component_id: "component1",
    layer: "top",
    points: [
      { x: -4, y: -1 },
      { x: -1, y: -1 },
      { x: -1, y: 1 },
      { x: -2.5, y: 2.5 },
      { x: -4, y: 1 },
    ],
  }

  const polygonBottom: PcbCourtyardPolygon = {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard_polygon_bottom",
    pcb_component_id: "component2",
    layer: "bottom",
    points: [
      { x: 1, y: -2 },
      { x: 4, y: -2 },
      { x: 4, y: 1 },
      { x: 2.5, y: 1 },
      { x: 2.5, y: -0.5 },
      { x: 1, y: -0.5 },
    ],
  }

  const polygonCustomColor: PcbCourtyardPolygon = {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard_polygon_custom",
    pcb_component_id: "component3",
    layer: "top",
    color: "#f59e0b",
    points: [
      { x: -1.5, y: 3 },
      { x: 1.5, y: 3 },
      { x: 0, y: 4.5 },
    ],
  }

  drawer.setCameraBounds({
    minX: -5,
    maxX: 5,
    minY: -3,
    maxY: 5.5,
  })

  drawer.drawElements([polygonTop, polygonBottom, polygonCustomColor])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("courtyard polygon respects layer filter", () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, 200, 200)

  const bottomPolygon: PcbCourtyardPolygon = {
    type: "pcb_courtyard_polygon",
    pcb_courtyard_polygon_id: "courtyard_polygon_bottom_only",
    pcb_component_id: "component1",
    layer: "bottom",
    points: [
      { x: -2, y: -2 },
      { x: 2, y: -2 },
      { x: 0, y: 2 },
    ],
  }

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements([bottomPolygon], { layers: ["top_courtyard"] })

  const pixels = ctx.getImageData(0, 0, 200, 200).data
  let nonBlackPixels = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
      nonBlackPixels++
    }
  }
  expect(nonBlackPixels).toBe(0)
})
