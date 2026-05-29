import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer, DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer"
import type { PcbColorMap } from "../../lib/drawer/types"

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

const boardTextureColorMap: PcbColorMap = {
  ...DEFAULT_PCB_COLOR_MAP,
  copper: {
    ...DEFAULT_PCB_COLOR_MAP.copper,
    top: "#ffe066",
    bottom: "#ffe066",
    inner1: "#ffe066",
    inner2: "#ffe066",
    inner3: "#ffe066",
    inner4: "#ffe066",
    inner5: "#ffe066",
    inner6: "#ffe066",
  },
  copperPour: {
    top: "#ffe066",
    bottom: "#ffe066",
  },
  drill: "rgba(0,0,0,0.5)",
  silkscreen: {
    top: "#ffffff",
    bottom: "#ffffff",
  },
}

test("board color props are opt-in and work with caller color overrides", async () => {
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

  const textureDrawer = new CircuitToCanvasDrawer(textureCtx)
  textureDrawer.configure({
    colorOverrides: boardTextureColorMap,
  })
  textureDrawer.drawElements(circuit, {
    drawSoldermask: true,
    useBoardColorProps: true,
  })

  expect(Array.from(textureCtx.getImageData(20, 40, 1, 1).data)).toEqual([
    32, 32, 96, 255,
  ])
  expect(Array.from(textureCtx.getImageData(30, 50, 1, 1).data)).toEqual([
    255, 224, 102, 255,
  ])
  expect(Array.from(textureCtx.getImageData(50, 30, 1, 1).data)).toEqual([
    255, 210, 0, 255,
  ])

  await expect(textureCanvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
