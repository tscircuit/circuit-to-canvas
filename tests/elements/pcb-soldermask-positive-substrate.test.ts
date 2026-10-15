import { expect, test } from "bun:test"
import {
  board,
  kinds,
  element,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

test("positive margins show substrate when board material is hidden", async () => {
  for (const kind of kinds) {
    const item = {
      ...element(kind, "top"),
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.25,
    }
    const { canvas, reference } = await renderPair({
      circuit: [board, item],
      layer: "top",
      enabled: true,
      drawBoardMaterial: false,
    })
    expect(materialAt({ canvas, x: 1.1 })).toBe("substrate")
    expect(materialAt({ canvas: reference, x: 1.1 })).toBe("substrate")
  }
})
