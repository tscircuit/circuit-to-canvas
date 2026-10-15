import { expect, test } from "bun:test"
import { compose, scale, translate } from "transformation-matrix"
import {
  render,
  openings,
  platedHoleShapes,
} from "../fixtures/soldermask-drill-openings"

test("collapsed plated-hole openings render safely and obey coverage", () => {
  for (const hole of platedHoleShapes) {
    for (const layer of ["top", "bottom"] as const) {
      const realToCanvasMat = compose(translate(100, 100), scale(100, -100))

      const exposed = render({ elements: [hole], layer })
      for (const margin of [-0.5, -0.75, -2]) {
        const covered = {
          ...hole,
          is_covered_with_solder_mask: true,
          soldermask_margin: margin,
        }
        const image = render({ elements: [covered], layer })
        expect(image.pixel()).toEqual([52, 135, 73, 255])
        expect(image.pixel(1.5, 1.5)).toEqual([12, 55, 33, 255])
        expect(
          render({ elements: [covered], layer, drawSoldermask: false }).pixels,
        ).toEqual(
          render({ elements: [hole], layer, drawSoldermask: false }).pixels,
        )
        for (const flag of [false, undefined]) {
          expect(
            render({
              elements: [{ ...covered, is_covered_with_solder_mask: flag }],
              layer,
            }).pixels,
          ).toEqual(exposed.pixels)
        }
      }
    }
  }
})
