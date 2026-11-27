import type { PcbCourtyardPill } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbCourtyardPillParams {
  ctx: CanvasContext
  pill: PcbCourtyardPill
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToCourtyardColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top
}

export function drawPcbCourtyardPill(params: DrawPcbCourtyardPillParams): void {
  const { ctx, pill, realToCanvasMat, colorMap } = params

  if (pill.width <= 0 || pill.height <= 0) return

  const radius = Math.max(
    0,
    Math.min(pill.radius, pill.width / 2, pill.height / 2),
  )

  drawRect({
    ctx,
    center: pill.center,
    width: pill.width,
    height: pill.height,
    borderRadius: radius,
    stroke: pill.color ?? layerToCourtyardColor(pill.layer, colorMap),
    strokeWidth: 0.05,
    realToCanvasMat,
    lineJoin: "round",
  })
}
