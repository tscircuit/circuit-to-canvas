import type { PcbCourtyardCircle } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"

export interface DrawPcbCourtyardCircleParams {
  ctx: CanvasContext
  circle: PcbCourtyardCircle
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbCourtyardCircle(
  params: DrawPcbCourtyardCircleParams,
): void {
  const { ctx, circle, realToCanvasMat, colorMap } = params

  drawCircle({
    ctx,
    center: circle.center,
    radius: circle.radius,
    stroke: colorMap.courtyard,
    strokeWidth: 0.05, // Default thin line for courtyard info
    realToCanvasMat,
  })
}
