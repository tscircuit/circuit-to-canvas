import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCourtyardPill } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw courtyard pill", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const horizontalPill: PcbCourtyardPill = {
    type: "pcb_courtyard_pill",
    pcb_courtyard_pill_id: "courtyard_pill_horizontal",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: -2, y: 2 },
    width: 4,
    height: 1.6,
    radius: 0.8,
  }

  const verticalPill: PcbCourtyardPill = {
    type: "pcb_courtyard_pill",
    pcb_courtyard_pill_id: "courtyard_pill_vertical",
    pcb_component_id: "component2",
    layer: "bottom",
    center: { x: 2.5, y: 1.5 },
    width: 1.6,
    height: 4,
    radius: 0.8,
  }

  const partialRadiusPill: PcbCourtyardPill = {
    type: "pcb_courtyard_pill",
    pcb_courtyard_pill_id: "courtyard_pill_partial",
    pcb_component_id: "component3",
    layer: "top",
    color: "#f59e0b",
    center: { x: 0, y: -2.5 },
    width: 5,
    height: 2,
    radius: 0.35,
  }

  drawer.setCameraBounds({
    minX: -5,
    maxX: 5,
    minY: -5,
    maxY: 5,
  })

  drawer.drawElements([horizontalPill, verticalPill, partialRadiusPill])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("courtyard pill respects layer filter", () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, 200, 200)

  const bottomPill: PcbCourtyardPill = {
    type: "pcb_courtyard_pill",
    pcb_courtyard_pill_id: "courtyard_pill_bottom_only",
    pcb_component_id: "component1",
    layer: "bottom",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    radius: 1,
  }

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements([bottomPill], { layers: ["top_courtyard"] })

  const pixels = ctx.getImageData(0, 0, 200, 200).data
  let nonBlackPixels = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
      nonBlackPixels++
    }
  }
  expect(nonBlackPixels).toBe(0)
})
