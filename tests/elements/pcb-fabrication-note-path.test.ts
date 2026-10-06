import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { CircuitJson, PcbFabricationNotePath } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import visualFixture from "../fixtures/fabrication-path-fill.circuit.json"

test("draw fabrication note path", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const path: PcbFabricationNotePath = {
    type: "pcb_fabrication_note_path",
    pcb_fabrication_note_path_id: "path1",
    pcb_component_id: "component1",
    layer: "top",
    route: [
      { x: 10, y: 50 },
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 90, y: 50 },
      { x: 70, y: 80 },
      { x: 30, y: 80 },
      { x: 10, y: 50 },
    ],
    stroke_width: 2,
  }

  drawer.drawElements([path])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

// An L-shaped solid region must fill its interior without expanding its boundary.
test("filled fabrication paths preserve concavity and disable stroke", () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  const path = {
    type: "pcb_fabrication_note_path" as const,
    pcb_fabrication_note_path_id: "solid-region",
    pcb_component_id: "component",
    layer: "top" as const,
    route: [
      { x: 10, y: 10 },
      { x: 80, y: 10 },
      { x: 80, y: 40 },
      { x: 40, y: 40 },
      { x: 40, y: 80 },
      { x: 10, y: 80 },
    ],
    stroke_width: 20,
    color: "rgba(255,0,0,0.5)",
    is_filled: true,
    has_stroke: false,
  }
  drawer.drawElements([path])
  const pixel = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data]
  expect(pixel(20, 20)).toEqual([255, 0, 0, 127])
  expect(pixel(60, 60)).toEqual([0, 0, 0, 0])
  expect(pixel(5, 20)).toEqual([0, 0, 0, 0])
  const implicit = canvas.toBuffer("image/png")
  ctx.clearRect(0, 0, 100, 100)
  drawer.drawElements([{ ...path, route: [...path.route, path.route[0]!] }])
  expect(canvas.toBuffer("image/png")).toEqual(implicit)
  ctx.clearRect(0, 0, 100, 100)
  const invisible = { ...path, is_filled: false }
  drawer.drawElements([invisible])
  expect(pixel(20, 20)).toEqual([0, 0, 0, 0])
})

test("filled fabrication paths close their outline and zero-width strokes do not reuse canvas state", () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  const path = {
    type: "pcb_fabrication_note_path" as const,
    pcb_fabrication_note_path_id: "outline",
    pcb_component_id: "component",
    layer: "top" as const,
    route: [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ],
    stroke_width: 10,
    color: "#ff0000",
    is_filled: true,
  }
  drawer.drawElements([path])
  expect(ctx.getImageData(16, 50, 1, 1).data[3]).toBe(255)
  ctx.clearRect(0, 0, 100, 100)
  ctx.lineWidth = 30
  drawer.drawElements([{ ...path, stroke_width: 0 }])
  expect(ctx.getImageData(16, 50, 1, 1).data[3]).toBe(0)
  expect(ctx.getImageData(40, 50, 1, 1).data[3]).toBe(255)
  expect(() => drawer.drawElements([{ ...path, route: [] }])).not.toThrow()
})

test("fabrication path fill modes visual snapshot", async () => {
  const canvas = createCanvas(800, 600)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.realToCanvasMat = { a: 14, b: 0, c: 0, d: -14, e: 400, f: 300 }
  drawer.drawElements(visualFixture as CircuitJson)
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "fabrication-path-fill",
  )
})
