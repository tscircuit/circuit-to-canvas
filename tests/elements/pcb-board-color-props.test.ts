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
    silkscreen_color: "#ffffff",
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

test("board color props are used for board texture colors", async () => {
  const defaultCanvas = createCanvas(100, 100)
  const defaultCtx = defaultCanvas.getContext("2d")
  defaultCtx.fillStyle = "#101010"
  defaultCtx.fillRect(0, 0, 100, 100)

  new CircuitToCanvasDrawer(defaultCtx).drawElements(circuit, {
    drawSoldermask: true,
  })

  expect(Array.from(defaultCtx.getImageData(20, 40, 1, 1).data)).toEqual([
    12, 55, 33, 255,
  ])
  expect(Array.from(defaultCtx.getImageData(30, 50, 1, 1).data)).toEqual([
    200, 52, 52, 255,
  ])

  const textureCanvas = createCanvas(100, 100)
  const textureCtx = textureCanvas.getContext("2d")
  textureCtx.fillStyle = "#101010"
  textureCtx.fillRect(0, 0, 100, 100)

  new CircuitToCanvasDrawer(textureCtx).drawElements(circuit, {
    drawSoldermask: true,
    useBoardTextureColors: true,
  })

  expect(Array.from(textureCtx.getImageData(20, 40, 1, 1).data)).toEqual([
    32, 32, 96, 255,
  ])
  expect(Array.from(textureCtx.getImageData(30, 50, 1, 1).data)).toEqual([
    255, 224, 102, 255,
  ])
  expect(Array.from(textureCtx.getImageData(50, 30, 1, 1).data)).toEqual([
    255, 255, 255, 255,
  ])

  await expect(textureCanvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
