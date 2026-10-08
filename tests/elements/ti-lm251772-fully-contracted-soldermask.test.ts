import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("LM251772EVM-PD fully contracted SMT pad soldermask", async () => {
  const canvas = createCanvas(300, 300)
  const drawer = new CircuitToCanvasDrawer(canvas.getContext("2d"))
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board0",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "lm251772evm_pd_pad_5_6_7_8",
      shape: "circle",
      layer: "top",
      x: 0,
      y: 0,
      radius: 2.2059994,
      soldermask_margin: -999.99999898,
    },
  ]

  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  expect(() =>
    drawer.drawElements(circuit, {
      drawBoardMaterial: true,
      drawSoldermask: true,
    }),
  ).not.toThrow()

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
