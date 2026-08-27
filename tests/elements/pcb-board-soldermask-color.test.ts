import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { mkdirSync } from "node:fs"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

mkdirSync(
  new URL("./__snapshots__/pcb-board-soldermask-color", import.meta.url),
  {
    recursive: true,
  },
)

const circuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 80,
    height: 60,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    solder_mask_color: "#ffffff",
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
    pcb_smtpad_id: "exposed_pad",
    shape: "rect",
    x: 30,
    y: 50,
    width: 12,
    height: 8,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "covered_pad",
    shape: "rect",
    x: 70,
    y: 50,
    width: 12,
    height: 8,
    layer: "top",
    is_covered_with_solder_mask: true,
  },
] as any as AnyCircuitElement[]

test("board soldermask color only affects base soldermask", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#101010"
  ctx.fillRect(0, 0, 100, 100)

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
  })

  // Realistic rendering: board mask uses the board color, while silkscreen,
  // exposed copper, and soldermask-over-copper keep their existing colors.
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-board-soldermask-color/board-soldermask-color",
  )
})

test("default soldermask color is used when board has no soldermask color", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#101010"
  ctx.fillRect(0, 0, 100, 100)
  // we are making the board solder_mask_color undefined to test that the default soldermask color is used instead of the board's solder_mask_color
  const circuitWithoutBoardColor = circuit.map((element) =>
    element.type === "pcb_board"
      ? { ...element, solder_mask_color: undefined }
      : element,
  ) as AnyCircuitElement[]

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements(circuitWithoutBoardColor, {
    drawSoldermask: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-board-soldermask-color/default-soldermask-color",
  )
})

test("board soldermask color does not apply outside soldermask rendering", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#101010"
  ctx.fillRect(0, 0, 100, 100)

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  // We are not enabling soldermask rendering here to test that the board's solder_mask_color does not affect other rendering when soldermask is not being rendered
  drawer.drawElements(circuit)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-board-soldermask-color/no-soldermask-render",
  )
})
