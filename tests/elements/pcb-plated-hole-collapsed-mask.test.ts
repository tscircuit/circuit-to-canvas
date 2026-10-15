import { expect, test } from "bun:test"
import { compose, scale, translate } from "transformation-matrix"
import { processPlatedHoleSoldermask } from "../../lib/drawer/elements/pcb-soldermask/plated-hole"
import {
  createStrictContext,
  openings,
  platedHoleShapes,
} from "../fixtures/soldermask-drill-openings"

test("collapsed plated-hole mask openings leave no cutout", () => {
  for (const hole of platedHoleShapes) {
    for (const layer of ["top", "bottom"] as const) {
      const realToCanvasMat = compose(translate(100, 100), scale(100, -100))

      for (const margin of [-0.5, -0.75, -2]) {
        const ctx = createStrictContext(200, 200)
        // A collapsed opening must clear this path before destination-out.
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.rect(0, 0, 200, 200)
        ctx.fill()
        processPlatedHoleSoldermask({
          ctx,
          hole: {
            ...hole,
            is_covered_with_solder_mask: true,
            soldermask_margin: margin,
          },
          realToCanvasMat,
          soldermaskOverCopperColor: "green",
          substrateColor: "yellow",
          phase: "openings",
          layer,
        })
        expect(Array.from(ctx.getImageData(100, 100, 1, 1).data)).toEqual([
          0, 128, 0, 255,
        ])
        expect(Array.from(ctx.getImageData(2, 2, 1, 1).data)).toEqual([
          255, 0, 0, 255,
        ])
        expect(
          ctx
            .getImageData(0, 0, 200, 200)
            .data.every((v, i) => i % 4 !== 3 || v === 255),
        ).toBe(true)
      }
    }
  }
})
