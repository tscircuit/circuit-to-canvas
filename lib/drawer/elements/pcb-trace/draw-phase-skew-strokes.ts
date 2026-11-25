import { applyToPoint } from "transformation-matrix"
import { drawCircle } from "../../shapes/circle"
import { drawLine, type DrawLineParams } from "../../shapes/line"
import type {
  PhaseSkewStroke,
  PhaseSkewStrokesByLayer,
} from "./get-drawable-phase-skew-strokes"

/** Overlay strokes are drawn 10% wider than the copper, as KiCad does (diff_phase_skew_tool.cpp), so the colour fully covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const GRADIENT_START = 0
const GRADIENT_END = 1

type DrawingContext = Pick<DrawLineParams, "ctx" | "realToCanvasMat">
type DrawRunParams = DrawingContext & { run: PhaseSkewStroke[] }

/** Draws two-stop gradients over one layer's copper. */
export function drawPhaseSkewStrokes({
  ctx,
  strokes,
  realToCanvasMat,
}: DrawingContext & {
  strokes: ReturnType<PhaseSkewStrokesByLayer["get"]>
}): void {
  if (strokes === undefined || strokes.length === 0) return

  ctx.save()
  for (const run of strokes) {
    const lineCap =
      run.length === 1 || ctx.createLinearGradient === undefined
        ? "round"
        : "butt"
    if (lineCap === "butt") drawRunDiscs({ run, ctx, realToCanvasMat })
    drawRunStrokes({ run, ctx, realToCanvasMat, lineCap })
  }
  ctx.restore()
}

function drawRunStrokes({
  run,
  ctx,
  realToCanvasMat,
  lineCap,
}: DrawRunParams & Pick<DrawLineParams, "lineCap">): void {
  for (const { start, end, width, startColor, endColor } of run) {
    let stroke: DrawLineParams["stroke"] = startColor
    if (startColor !== endColor) {
      if (ctx.createLinearGradient === undefined) continue
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
    drawLine({ ctx, start, end, stroke, strokeWidth, realToCanvasMat, lineCap })
  }
}

function drawRunDiscs(params: DrawRunParams): void {
  const { run, ctx, realToCanvasMat } = params
  // Canvas applies one cap style to both ends. Put the round ends and
  // joint fills beneath the butt-capped gradients.
  for (const [i, { start, width, startColor }] of run.entries()) {
    const previous = run[i - 1]
    const jointWidth =
      previous === undefined ? width : Math.max(width, previous.width)
    drawCircle({
      ctx,
      center: start,
      radius: (jointWidth * OVERLAY_WIDTH_FACTOR) / 2,
      fill: startColor,
      realToCanvasMat,
    })
  }

  const last = run.at(-1)
  if (last === undefined) return
  drawCircle({
    ctx,
    center: last.end,
    radius: (last.width * OVERLAY_WIDTH_FACTOR) / 2,
    fill: last.endColor,
    realToCanvasMat,
  })
}
