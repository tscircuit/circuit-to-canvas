import { expect, test } from "bun:test"
import { compose, scale, translate } from "transformation-matrix"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"
import { drawPcbPlatedHole } from "../../lib/drawer/elements/pcb-plated-hole"
import {
  createStrictContext,
  platedHoleShapes,
} from "../fixtures/soldermask-drill-openings"

test("collapsed plated-hole copper preserves the drill", () => {
  for (const hole of platedHoleShapes) {
    for (const layer of ["top", "bottom"] as const) {
      const realToCanvasMat = compose(translate(100, 100), scale(100, -100))

      const reference = createStrictContext(200, 200)
      drawPcbPlatedHole({
        ctx: reference,
        hole,
        realToCanvasMat,
        colorMap: {
          ...DEFAULT_PCB_COLOR_MAP,
          copper: { ...DEFAULT_PCB_COLOR_MAP.copper, [layer]: "transparent" },
        },
        layer,
      })
      const drillOnly = reference.getImageData(0, 0, 200, 200).data
      for (const margin of [-0.5, -0.75, -2]) {
        const ctx = createStrictContext(200, 200)
        drawPcbPlatedHole({
          ctx,
          hole: { ...hole, is_covered_with_solder_mask: true },
          realToCanvasMat,
          colorMap: DEFAULT_PCB_COLOR_MAP,
          soldermaskMargin: margin,
          drawSoldermask: true,
          layer,
        })
        expect(ctx.getImageData(0, 0, 200, 200).data).toEqual(drillOnly)
      }
    }
  }
})
