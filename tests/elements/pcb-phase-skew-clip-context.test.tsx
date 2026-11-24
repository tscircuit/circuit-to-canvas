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
  const negativeSample = applyToPoint(drawer.realToCanvasMat, { x: 0, y: -0.6 })
  return {
    png: canvas.toBuffer("image/png"),
    positiveTracePixel: Array.from(
      ctx.getImageData(sample.x, sample.y, 1, 1).data,
    ),
    negativeTracePixel: Array.from(
      ctx.getImageData(negativeSample.x, negativeSample.y, 1, 1).data,
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

test("trace-only passes use pair metadata from clipContextElements", () => {
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

test("context supplies an undrawn partner without painting it", () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const positiveTrace = circuitJson.find(
    (element) => element.type === "pcb_trace",
  )!
  const subset = renderTracePass({
    elements: [positiveTrace],
    clipContextElements: circuitJson,
  })
  expect(subset.positiveTracePixel).toEqual([255, 255, 255, 255])
  expect(subset.negativeTracePixel).toEqual([0, 0, 0, 0])
})

test("repeating full context does not duplicate pair traces", () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const full = renderTracePass({ elements: circuitJson })
  const repeated = renderTracePass({
    elements: circuitJson,
    clipContextElements: circuitJson,
  })
  expect(repeated.png).toEqual(full.png)
  expect(repeated.positiveTracePixel).toEqual([255, 255, 255, 255])
})

test("drawn routes override stale routes in context", () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const staleContext = circuitJson.map((element) =>
    element.type === "pcb_trace"
      ? {
          ...element,
          route: element.route.map((point) =>
            point.route_type === "wire" ? { ...point, y: point.y + 2 } : point,
          ),
        }
      : element,
  )
  const traces = circuitJson.filter((element) => element.type === "pcb_trace")
  const subset = renderTracePass({
    elements: traces,
    clipContextElements: staleContext,
  })
  expect(subset.positiveTracePixel).toEqual([255, 255, 255, 255])
  expect(subset.negativeTracePixel).toEqual([255, 255, 255, 255])
})
