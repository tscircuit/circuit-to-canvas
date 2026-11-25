import { applyToPoint, type Matrix } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import type { PhaseSkewStroke } from "./get-drawable-phase-skew-strokes"

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
  ctx.lineCap = "round"
  for (const { start, end, width, startColor, endColor } of strokes) {
    const startPx = applyToPoint(realToCanvasMat, start)
    const endPx = applyToPoint(realToCanvasMat, end)

    if (startColor === endColor) {
      ctx.strokeStyle = startColor
    } else {
      if (!ctx.createLinearGradient) continue
      const gradient = ctx.createLinearGradient(
        startPx.x,
        startPx.y,
        endPx.x,
        endPx.y,
      )
      gradient.addColorStop(GRADIENT_START, startColor)
      gradient.addColorStop(GRADIENT_END, endColor)
      ctx.strokeStyle = gradient
    }

    ctx.lineWidth = width * OVERLAY_WIDTH_FACTOR * Math.abs(realToCanvasMat.a)
    ctx.beginPath()
    ctx.moveTo(startPx.x, startPx.y)
    ctx.lineTo(endPx.x, endPx.y)
    ctx.stroke()
  }
  ctx.restore()
}
