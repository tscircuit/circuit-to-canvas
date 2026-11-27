import type { PcbSilkscreenRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbSilkscreenRectParams {
  ctx: CanvasContext
  rect: PcbSilkscreenRect
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenRect(
  params: DrawPcbSilkscreenRectParams,
): void {
  const { ctx, rect, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(rect.layer, colorMap)
  const isFilled = rect.is_filled ?? false
  const hasStroke = rect.has_stroke ?? true
  const isStrokeDashed = rect.is_stroke_dashed ?? false

  drawRect({
    ctx,
    center: rect.center,
    width: rect.width,
    height: rect.height,
    borderRadius: rect.corner_radius,
    fill: isFilled ? color : undefined,
    stroke: hasStroke ? color : undefined,
    strokeWidth: hasStroke ? rect.stroke_width : undefined,
    ccwRotationDegrees: rect.ccw_rotation ?? 0,
    isStrokeDashed,
    realToCanvasMat,
  })
}
