import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbDebugObject } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const debugObjects: PcbDebugObject[] = [
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_rect",
    shape: "rect",
    center: { x: -3, y: 2 },
    size: { width: 6, height: 4 },
    label: "phase 1 bounds",
  },
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_line",
    shape: "line",
    start: { x: -6, y: -4 },
    end: { x: 6, y: 4 },
    label: "candidate route",
  },
  {
    type: "pcb_debug_object",
    pcb_debug_object_id: "pcb_debug_object_point",
    shape: "point",
    center: { x: 4, y: -3 },
    label: "breakout",
  },
]

const createDebugCanvas = (showDebugObjects: boolean) => {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 })
  drawer.drawElements(debugObjects, { showDebugObjects })

  return canvas
}

test("PCB debug objects are opt-in", () => {
  const hiddenCanvas = createDebugCanvas(false)
  const blankCanvas = createCanvas(400, 300)
  const blankCtx = blankCanvas.getContext("2d")
  blankCtx.fillStyle = "#000"
  blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height)

  expect(hiddenCanvas.toBuffer("image/png")).toEqual(
    blankCanvas.toBuffer("image/png"),
  )
})

test("draws labeled PCB debug objects", () => {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext("2d")
  const labels: string[] = []
  const originalFillText = ctx.fillText.bind(ctx)
  ctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    labels.push(text)
    if (maxWidth === undefined) originalFillText(text, x, y)
    else originalFillText(text, x, y, maxWidth)
  }

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 })
  drawer.drawElements(debugObjects, { showDebugObjects: true })

  expect(labels).toEqual(["phase 1 bounds", "candidate route", "breakout"])
  expect(canvas.toBuffer("image/png")).not.toEqual(
    createCanvas(400, 300).toBuffer("image/png"),
  )
})

test("places rectangle labels above the top-left corner", () => {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext("2d")
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = []
  const originalFillText = ctx.fillText.bind(ctx)
  ctx.fillText = (text: string, x: number, y: number, maxWidth?: number) => {
    fillTextCalls.push({ text, x, y })
    if (maxWidth === undefined) originalFillText(text, x, y)
    else originalFillText(text, x, y, maxWidth)
  }

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 })
  drawer.drawElements([debugObjects[0]!], { showDebugObjects: true })

  expect(fillTextCalls).toEqual([{ text: "phase 1 bounds", x: 80, y: 66.5 }])
})

test("stacks labels for overlapping rectangles", () => {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext("2d")
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = []
  ctx.fillText = (text: string, x: number, y: number) => {
    fillTextCalls.push({ text, x, y })
  }

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -7.5, maxY: 7.5 })
  drawer.drawElements(
    [
      debugObjects[0]!,
      { ...debugObjects[0]!, pcb_debug_object_id: "rect_2", label: "phase 2" },
    ],
    { showDebugObjects: true },
  )

  expect(fillTextCalls).toEqual([
    { text: "phase 1 bounds", x: 80, y: 66.5 },
    { text: "phase 2", x: 80, y: 53 },
  ])
})
