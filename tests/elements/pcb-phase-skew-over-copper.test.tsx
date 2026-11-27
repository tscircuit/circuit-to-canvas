import { expect, test } from "bun:test"
import type { PcbRenderLayer } from "circuit-json"
import { drawPcbDifferentialPairPhaseSkew } from "../../lib"
import {
  PlatedHoleLayerChangeBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("the overlay is drawn over plated hole and via copper", async () => {
  const circuitJson = renderBoard({ board: <PlatedHoleLayerChangeBoard /> })
  const { canvas } = renderCanvas({ circuitJson })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("drawPcbDifferentialPairPhaseSkew draws only the overlay of the given traces", () => {
  const circuitJson = renderBoard({ board: <PlatedHoleLayerChangeBoard /> })
  const layers: PcbRenderLayer[] = ["top_copper"]
  const { canvas, realToCanvasMat, pixelAt } = renderCanvas({
    circuitJson,
    options: { layers },
  })
  const skew = circuitJson.find(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )!
  const positiveViaRing = { x: -0.35, y: 0.6 }
  const negativeViaRing = { x: -0.35, y: -0.6 }
  const copper = [200, 52, 52, 255]
  expect(pixelAt(positiveViaRing)).toEqual(copper)

  // Leaving out the negative trace leaves out its overlay.
  drawPcbDifferentialPairPhaseSkew({
    ctx: canvas.getContext("2d"),
    elements: circuitJson.filter(
      (element) =>
        element.type !== "pcb_trace" ||
        element.pcb_trace_id !== skew.negative_trace.pcb_trace_id,
    ),
    realToCanvasMat,
    layers,
  })

  expect(pixelAt(positiveViaRing)).toEqual([139, 139, 255, 255])
  expect(pixelAt(negativeViaRing)).toEqual(copper)
})
