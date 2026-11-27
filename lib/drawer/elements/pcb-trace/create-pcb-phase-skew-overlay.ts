import type { PcbPhaseSkewIndex } from "@tscircuit/circuit-json-util"
import type { LayerRef } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { DrawElementsOptions } from "../../CircuitToCanvasDrawer"
import type { CanvasContext } from "../../types"
import { drawPhaseSkewStrokes } from "./draw-phase-skew-strokes"
import {
  getPhaseSkewStrokes,
  type PhaseSkewStrokesByLayer,
} from "./get-phase-skew-strokes"

/** Prepare an overlay for compositing over copper and below drills and soldermask. */
export function createPcbPhaseSkewOverlay(
  index: PcbPhaseSkewIndex,
  colors?: DrawElementsOptions["phaseSkewColors"],
) {
  let strokes: PhaseSkewStrokesByLayer | undefined
  return function drawLayer({
    ctx,
    layer,
    realToCanvasMat,
    highlightedTraceIds,
  }: {
    ctx: CanvasContext
    layer: LayerRef
    realToCanvasMat: Matrix
    highlightedTraceIds?: ReadonlySet<string>
  }) {
    strokes ??= getPhaseSkewStrokes({ index, ctx, colors })
    drawPhaseSkewStrokes({
      ctx,
      realToCanvasMat,
      strokes: strokes.get(layer),
      highlightedTraceIds,
    })
  }
}
