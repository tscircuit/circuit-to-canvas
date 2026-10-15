import { expect, test } from "bun:test"
import {
  board,
  kinds,
  element,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

test("pad and hole coverage flags and margins match SVG", async () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const kind of kinds) {
      for (const covered of [undefined, false, true]) {
        for (const margin of [-0.25, 0, 0.25]) {
          const item = {
            ...element(kind, layer),
            soldermask_margin: margin,
            ...(covered === undefined
              ? {}
              : { is_covered_with_solder_mask: covered }),
          }
          const { canvas, reference } = await renderPair({
            circuit: [board, item],
            layer,
          })
          const exposed = kind === "hole" ? "drill" : "copper"
          const fullyCovered =
            kind === "pad" && covered === true && margin === 0
          const expectedEdge =
            (covered === true && margin < 0) || fullyCovered ? "mask" : exposed
          const expectedOutside =
            covered === true && margin > 0 ? "substrate" : "mask"
          for (const image of [reference, canvas]) {
            expect(materialAt({ canvas: image, x: 0.9 })).toBe(expectedEdge)
            expect(materialAt({ canvas: image, x: 1.1 })).toBe(expectedOutside)
            expect(materialAt({ canvas: image, x: 0 })).toBe(
              kind === "pad" ? (fullyCovered ? "mask" : "copper") : "drill",
            )
          }
        }
      }
    }
  }
})
