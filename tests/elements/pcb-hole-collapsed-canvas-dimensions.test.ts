import { expect, test } from "bun:test"
import { identity } from "transformation-matrix"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"
import { drawPcbHole } from "../../lib/drawer/elements/pcb-hole"
import { processHoleSoldermask } from "../../lib/drawer/elements/pcb-soldermask/hole"
import {
  createStrictContext,
  openings,
  holeShapes,
} from "../fixtures/soldermask-drill-openings"

test("collapsed hole openings use no invalid Canvas dimensions", () => {
  for (const hole of holeShapes) {
    const ctx = createStrictContext(20, 20)
    for (const margin of [-0.5, -0.75, -2]) {
      const covered = {
        ...hole,
        x: 10,
        y: 10,
        is_covered_with_solder_mask: true,
        soldermask_margin: margin,
      }
      ctx.clearRect(0, 0, 20, 20)
      drawPcbHole({
        ctx,
        hole: covered,
        realToCanvasMat: identity(),
        colorMap: DEFAULT_PCB_COLOR_MAP,
        soldermaskMargin: margin,
        drawSoldermask: true,
      })
      expect(ctx.getImageData(0, 0, 20, 20).data.every((v) => v === 0)).toBe(
        true,
      )

      // Leave a path outside the hole to catch stale-path cuts on early return.
      ctx.fillStyle = "red"
      ctx.beginPath()
      ctx.rect(0, 0, 5, 5)
      ctx.fill()
      processHoleSoldermask({
        ctx,
        hole: covered,
        realToCanvasMat: identity(),
        soldermaskOverCopperColor: "green",
        substrateColor: "yellow",
        phase: "openings",
      })
      expect(Array.from(ctx.getImageData(2, 2, 1, 1).data)).toEqual([
        255, 0, 0, 255,
      ])
    }
  }
})
