import { expect, test } from "bun:test"
import {
  render,
  openings,
  holeShapes,
} from "../fixtures/soldermask-drill-openings"

test("collapsed negative-margin hole openings stay masked", () => {
  for (const hole of holeShapes) {
    for (const layer of ["top", "bottom"] as const) {
      for (const margin of [-0.5, -0.75, -2]) {
        const covered = {
          ...hole,
          is_covered_with_solder_mask: true,
          soldermask_margin: margin,
        }
        const image = render({ elements: [covered], layer })
        expect(image.pixel()).toEqual([52, 135, 73, 255])
        // A collapsed opening must not reuse the board's previous path.
        expect(image.pixel(1.5, 1.5)).toEqual([12, 55, 33, 255])
        expect(
          render({ elements: [covered], layer, drawSoldermask: false }).pixel(),
        ).toEqual([255, 38, 226, 255])
        for (const flag of [false, undefined]) {
          expect(
            render({
              elements: [{ ...covered, is_covered_with_solder_mask: flag }],
              layer,
            }).pixel(),
          ).toEqual([255, 38, 226, 255])
        }
      }
    }
  }
})
