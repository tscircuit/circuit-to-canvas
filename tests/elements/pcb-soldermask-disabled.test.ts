import { expect, test } from "bun:test"
import {
  board,
  kinds,
  element,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

test("disabling soldermask ignores coverage and margins", async () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const kind of kinds) {
      const item = {
        ...element(kind, layer),
        is_covered_with_solder_mask: true,
        soldermask_margin: -0.25,
      }
      const { canvas, reference } = await renderPair({
        circuit: [board, item],
        layer,
        enabled: false,
      })
      for (const image of [reference, canvas]) {
        expect(materialAt({ canvas: image, x: 0.9 })).toBe(
          kind === "hole" ? "drill" : "copper",
        )
      }
    }
  }
})
