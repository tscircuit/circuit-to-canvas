import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenRect } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen rect with rotation, dashed stroke, and fill-only", async () => {
  const canvas = createCanvas(1000, 1000)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 1000, 1000)

  const rotatedRect: PcbSilkscreenRect = {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect_rotated",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: -2.5, y: 2 },
    width: 3.6,
    height: 1.4,
    stroke_width: 0.12,
    ccw_rotation: 35,
  }

  const dashedRect: PcbSilkscreenRect = {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect_dashed",
    pcb_component_id: "component2",
    layer: "bottom",
    center: { x: 2.5, y: 2 },
    width: 3.4,
    height: 1.8,
    stroke_width: 0.12,
    corner_radius: 0.3,
    is_stroke_dashed: true,
    ccw_rotation: -20,
  }

  const filledNoStrokeRect: PcbSilkscreenRect = {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect_filled_no_stroke",
    pcb_component_id: "component3",
    layer: "top",
    center: { x: 0, y: -2.2 },
    width: 3.6,
    height: 1.6,
    stroke_width: 0.5,
    is_filled: true,
    has_stroke: false,
    ccw_rotation: 15,
  }

  drawer.setCameraBounds({
    minX: -6,
    maxX: 6,
    minY: -5,
    maxY: 5,
  })

  drawer.drawElements([rotatedRect, dashedRect, filledNoStrokeRect])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("silkscreen rect honors has_stroke=false without drawing stroke", () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, 200, 200)

  const noStrokeNoFillRect: PcbSilkscreenRect = {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "rect_invisible",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    stroke_width: 0.4,
    is_filled: false,
    has_stroke: false,
  }

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements([noStrokeNoFillRect])

  const pixels = ctx.getImageData(0, 0, 200, 200).data
  let nonBlackPixels = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
      nonBlackPixels++
    }
  }
  expect(nonBlackPixels).toBe(0)
})
