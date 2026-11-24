import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { CircuitJson } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib"
import {
  MatchedPairBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { stackPngsVertically } from "../fixtures/stackPngsVertically"

function renderTracePass({
  elements,
  clipContextElements,
}: {
  elements: CircuitJson
  clipContextElements?: CircuitJson
}) {
  const canvas = createCanvas(600, 240)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -15, maxX: 15, minY: -6, maxY: 6 })
  drawer.drawElements(elements, {
    showDifferentialPairPhaseSkew: true,
    layers: ["top_copper"],
    clipContextElements,
  })
  const sample = applyToPoint(drawer.realToCanvasMat, { x: 0, y: 0.6 })
  return {
    png: canvas.toBuffer("image/png"),
    positiveTracePixel: Array.from(
      ctx.getImageData(sample.x, sample.y, 1, 1).data,
    ),
  }
}

test("snapshot: phase skew with full elements and a trace-only context pass", async () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  const full = renderTracePass({ elements: circuitJson })
  const subset = renderTracePass({
    elements: traces,
    clipContextElements: circuitJson,
  })
  const stacked = await stackPngsVertically(
    [
      { png: full.png, label: "circuit-to-canvas" },
      { png: subset.png, label: "circuit-to-canvas" },
    ],
    "Phase skew: full board (top), trace subset (bottom)",
  )
  await expect(stacked).toMatchPngSnapshot(import.meta.path)
})

test.failing("trace-only passes use pair metadata from clipContextElements", () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  const full = renderTracePass({ elements: circuitJson })
  const subset = renderTracePass({
    elements: traces,
    clipContextElements: circuitJson,
  })
  expect(full.positiveTracePixel).toEqual([255, 255, 255, 255])
  expect(subset.positiveTracePixel).toEqual(full.positiveTracePixel)
})
