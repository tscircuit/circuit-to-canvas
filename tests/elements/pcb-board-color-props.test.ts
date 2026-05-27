import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 80,
    height: 60,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    solder_mask_color: "#202060",
    silkscreen_color: "#ffd200",
  },
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "line1",
    pcb_component_id: "component1",
    layer: "top",
    x1: 50,
    y1: 25,
    x2: 50,
    y2: 75,
    stroke_width: 3,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    shape: "rect",
    x: 30,
    y: 50,
    width: 12,
    height: 8,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad2",
    shape: "rect",
    x: 70,
    y: 50,
    width: 12,
    height: 8,
    layer: "top",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace1",
    route: [
      { route_type: "wire", x: 30, y: 50, width: 3, layer: "top" },
      { route_type: "wire", x: 70, y: 50, width: 3, layer: "top" },
    ],
  },
]

test("board color props are used only when drawing soldermask", async () => {
  const plainCanvas = createCanvas(100, 100)
  const plainCtx = plainCanvas.getContext("2d")
  plainCtx.fillStyle = "#101010"
  plainCtx.fillRect(0, 0, 100, 100)

  new CircuitToCanvasDrawer(plainCtx).drawElements(circuit)

  const plainPixel = plainCtx.getImageData(20, 40, 1, 1).data
  expect(Array.from(plainPixel)).toEqual([16, 16, 16, 255])

  const realisticCanvas = createCanvas(100, 100)
  const realisticCtx = realisticCanvas.getContext("2d")
  realisticCtx.fillStyle = "#101010"
  realisticCtx.fillRect(0, 0, 100, 100)

  new CircuitToCanvasDrawer(realisticCtx).drawElements(circuit, {
    drawSoldermask: true,
  })

  await expect(realisticCanvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )

  const overrideCanvas = createCanvas(100, 100)
  const overrideCtx = overrideCanvas.getContext("2d")
  overrideCtx.fillStyle = "#101010"
  overrideCtx.fillRect(0, 0, 100, 100)

  const overrideDrawer = new CircuitToCanvasDrawer(overrideCtx)
  overrideDrawer.configure({
    colorOverrides: {
      soldermask: { top: "#008000", bottom: "#008000" },
      silkscreen: { top: "#ff00ff", bottom: "#ff00ff" },
    },
  })
  overrideDrawer.drawElements(circuit, { drawSoldermask: true })

  expect(Array.from(overrideCtx.getImageData(20, 40, 1, 1).data)).toEqual([
    0, 128, 0, 255,
  ])
  expect(Array.from(overrideCtx.getImageData(50, 30, 1, 1).data)).toEqual([
    255, 0, 255, 255,
  ])
})
