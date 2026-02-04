import type { PcbCourtyardRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"

export interface DrawPcbCourtyardRectParams {
  ctx: CanvasContext
  rect: PcbCourtyardRect
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbCourtyardRect(params: DrawPcbCourtyardRectParams): void {
  const { ctx, rect, realToCanvasMat, colorMap } = params

  drawRect({
    ctx,
    center: rect.center,
    width: rect.width,
    height: rect.height,
    stroke: colorMap.courtyard,
    strokeWidth: 0.05, // Default thin line for courtyard info
    realToCanvasMat,
  })
}
