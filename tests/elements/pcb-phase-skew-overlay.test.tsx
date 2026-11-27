import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { createPcbPhaseSkewIndex } from "@tscircuit/circuit-json-util"
import { createPcbPhaseSkewOverlay } from "../../lib"
import {
  SkewRampBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { applyToPoint, fromObject } from "transformation-matrix"

test("composites just the measured copper and leaves highlighted traces and other layers intact", () => {
  const board = renderBoard({ board: <SkewRampBoard maxLengthSkew={0} /> })
  const pair = board.find(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )!
  const drawLayer = createPcbPhaseSkewOverlay(createPcbPhaseSkewIndex(board))
  const canvas = createCanvas(600, 240)
  const ctx = canvas.getContext("2d")
  const realToCanvasMat = fromObject({
    a: 20,
    b: 0,
    c: 0,
    d: -20,
    e: 300,
    f: 120,
  })
  const pixel = (x: number, y: number) => {
    const p = applyToPoint(realToCanvasMat, { x, y })
    return Array.from(
      ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data,
    )
  }
  const highlightedTraceIds = new Set([pair.negative_trace.pcb_trace_id])
  ctx.fillStyle = "lime"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawLayer({ ctx, layer: "bottom", realToCanvasMat })
  expect(pixel(-3.9, 0.6)).toEqual([0, 255, 0, 255])
  drawLayer({ ctx, layer: "top", realToCanvasMat, highlightedTraceIds })
  expect(pixel(-3.9, 0.6)).toEqual([255, 0, 0, 255])
  expect(pixel(-3, -0.6 - Math.sqrt(12) / 2)).toEqual([0, 255, 0, 255])
  expect(pixel(0, 4)).toEqual([0, 255, 0, 255])
  drawLayer({ ctx, layer: "top", realToCanvasMat })
  expect(pixel(-3, -0.6 - Math.sqrt(12) / 2)).toEqual([0, 0, 255, 255])
})
