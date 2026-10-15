import { expect, test } from "bun:test"
import {
  board,
  kinds,
  element,
  renderPair,
} from "../fixtures/soldermask-svg-behavior"

test("coverage and margins preserve Canvas colors and opaque board masks", async () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const drawBoardMaterial of [false, true]) {
      for (const kind of kinds) {
        const { canvas } = await renderPair({
          circuit: [
            board,
            {
              ...element(kind, layer),
              is_covered_with_solder_mask: true,
              soldermask_margin: -0.25,
            },
          ],
          layer,
          enabled: true,
          drawBoardMaterial,
        })
        const ctx = canvas.getContext("2d")
        expect(Array.from(ctx.getImageData(290, 200, 1, 1).data)).toEqual([
          52, 135, 73, 255,
        ])
        expect(Array.from(ctx.getImageData(340, 200, 1, 1).data)).toEqual([
          12, 55, 33, 255,
        ])
      }
      const { canvas } = await renderPair({
        circuit: [
          board,
          { ...element("pad", layer), is_covered_with_solder_mask: true },
        ],
        layer,
        enabled: true,
        drawBoardMaterial,
      })
      expect(
        Array.from(canvas.getContext("2d").getImageData(200, 200, 1, 1).data),
      ).toEqual([52, 135, 73, 255])
    }
  }
})
