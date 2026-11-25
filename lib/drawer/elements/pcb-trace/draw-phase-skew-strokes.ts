import { applyToPoint, type Matrix } from "transformation-matrix"
import { drawLine } from "../../shapes/line"
import type { CanvasContext } from "../../types"
import type { PhaseSkewStroke } from "./get-drawable-phase-skew-strokes"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const GRADIENT_START = 0
const GRADIENT_END = 1

/** Draws round-capped, two-stop gradients over one layer's copper. */
export function drawPhaseSkewStrokes({
  ctx,
  strokes,
  realToCanvasMat,
}: {
  ctx: CanvasContext
  strokes: PhaseSkewStroke[] | undefined
  realToCanvasMat: Matrix
}): void {
  if (!strokes?.length) return

  ctx.save()
  for (const { start, end, width, startColor, endColor } of strokes) {
    let stroke: CanvasContext["strokeStyle"] = startColor
    if (startColor !== endColor) {
      if (!ctx.createLinearGradient) continue
      const startPx = applyToPoint(realToCanvasMat, start)
      const endPx = applyToPoint(realToCanvasMat, end)
      const gradient = ctx.createLinearGradient(
        startPx.x,
        startPx.y,
        endPx.x,
        endPx.y,
      )
      gradient.addColorStop(GRADIENT_START, startColor)
      gradient.addColorStop(GRADIENT_END, endColor)
      stroke = gradient
    }

    const strokeWidth = width * OVERLAY_WIDTH_FACTOR
    drawLine({ ctx, start, end, stroke, strokeWidth, realToCanvasMat })
  }
  ctx.restore()
}
