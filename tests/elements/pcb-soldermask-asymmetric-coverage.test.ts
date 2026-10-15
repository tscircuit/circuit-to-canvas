import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  board,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

test("asymmetric rectangular margins obey coverage and explicit zero overrides", async () => {
  for (const covered of [undefined, false, true]) {
    const pad: AnyCircuitElement = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rect",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      is_covered_with_solder_mask: covered,
      soldermask_margin_left: -0.25,
      soldermask_margin_right: 0.25,
      soldermask_margin_top: -0.25,
      soldermask_margin_bottom: 0.25,
    }
    const { canvas, reference } = await renderPair({
      circuit: [board, pad],
      layer: "top",
    })
    for (const image of [reference, canvas]) {
      expect(materialAt({ canvas: image, x: -0.9 })).toBe(
        covered ? "mask" : "copper",
      )
      expect(materialAt({ canvas: image, x: 0, y: 0.9 })).toBe(
        covered ? "mask" : "copper",
      )
      // SVG's mixed-margin opening is copper, including its expanded sides.
      expect(materialAt({ canvas: image, x: 1.1 })).toBe(
        covered ? "copper" : "mask",
      )
    }
  }
  const pad: AnyCircuitElement = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rect",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    is_covered_with_solder_mask: true,
    soldermask_margin: 0.25,
    soldermask_margin_left: 0,
    soldermask_margin_right: 0,
    soldermask_margin_top: 0,
    soldermask_margin_bottom: 0,
  }
  const { canvas, reference } = await renderPair({
    circuit: [board, pad],
    layer: "top",
  })
  for (const image of [reference, canvas])
    expect(materialAt({ canvas: image, x: 0 })).toBe("mask")
})
