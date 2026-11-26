import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import ddrFixture from "../fixtures/phase-skew/am3352-ddr-track-a.circuit.json"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

// Generated from 0hmX/am3352-ddr-track-a-local-dfm-wip-20261007@0.0.17 with
// three <differentialpair>s added. Core 0.0.2483 rendered the board, and
// compute-differential-pair-phase-skew PR #18 supplied the skew records.
// A script retained the board, the three skew records, their six traces,
// and the vias matching those routes by position and layer pair.
const circuitJson = ddrFixture as CircuitJson

test("renders end-to-end skew for the three AM3352 DDR differential pairs", async () => {
  const { canvas, pixelAt } = renderCanvas({
    circuitJson,
    options: { showDifferentialPairEndToEndSkew: true },
    view: {
      width: 480,
      height: 1104,
      bounds: { minX: -5.2, maxX: 4.8, minY: -29, maxY: -5 },
    },
  })

  // Sample the centers of both legs of each pair at y = -15 mm.
  for (const x of [1.355, 1.669]) {
    expect(pixelAt({ x, y: -15 })).toEqual([255, 255, 255, 255]) // DDR_DQS_PAIR1, +0.00049 mm
  }
  for (const x of [3.478, 3.704]) {
    expect(pixelAt({ x, y: -15 })).toEqual([0, 0, 255, 255]) // DDR_DQS_PAIR0, +0.38747 mm
  }
  for (const x of [-4.289, -4.511]) {
    expect(pixelAt({ x, y: -15 })).toEqual([209, 209, 255, 255]) // DDR_CK_PAIR, +0.07000 mm
  }

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
