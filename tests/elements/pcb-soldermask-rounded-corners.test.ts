import { expect, test } from "bun:test"
import {
  board,
  renderPair,
  materialAt,
  shapeCases,
} from "../fixtures/soldermask-svg-behavior"

test("positive margins expand rounded pad corner radii like SVG", async () => {
  for (const { item } of shapeCases.filter(
    ({ item }) =>
      "shape" in item &&
      (item.shape === "rect" || item.shape === "circular_hole_with_rect_pad"),
  )) {
    const pad = {
      ...item,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.25,
    }
    const { canvas, reference } = await renderPair({
      circuit: [board, pad],
      layer: "top",
    })
    const x = item.type === "pcb_smtpad" ? 1.12 : 1.62
    expect(materialAt({ canvas: reference, x, y: 1.12 })).toBe("mask")
    expect(materialAt({ canvas, x, y: 1.12 })).toBe("mask")
  }
})
