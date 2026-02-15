import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("render top copper pour with soldermask-over-copper color", async () => {
  const canvas = createCanvas(900, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 900, 500)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_top_pour_mask",
      center: { x: 0, y: 0 },
      width: 18,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "top_pour",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -6, y: 3.5 },
        { x: 6, y: 3.5 },
        { x: 6, y: -3.5 },
        { x: -6, y: -3.5 },
      ],
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "top_opening_pad",
      shape: "rect",
      layer: "top",
      x: -2.5,
      y: 0,
      width: 2.2,
      height: 1.2,
      soldermask_margin: 0.2,
    },
  ]

  drawer.setCameraBounds({ minX: -9, maxX: 9, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawSoldermaskTop: true,
    drawSoldermaskBottom: false,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "top-copper-pour-soldermask",
  )
})

test("render bottom copper pour with soldermask-over-copper color", async () => {
  const canvas = createCanvas(900, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 900, 500)

  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board_bottom_pour_mask",
      center: { x: 0, y: 0 },
      width: 18,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "bottom_pour",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: -6, y: 3.5 },
        { x: 6, y: 3.5 },
        { x: 6, y: -3.5 },
        { x: -6, y: -3.5 },
      ],
      covered_with_solder_mask: true,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "bottom_opening_pad",
      shape: "rect",
      layer: "bottom",
      x: 2.5,
      y: 0,
      width: 2.2,
      height: 1.2,
      soldermask_margin: 0.2,
    },
  ]

  drawer.setCameraBounds({ minX: -9, maxX: 9, minY: -5, maxY: 5 })
  drawer.drawElements(circuit, {
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
    drawBoardMaterial: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "bottom-copper-pour-soldermask",
  )
})
