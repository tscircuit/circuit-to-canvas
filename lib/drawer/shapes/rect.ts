import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawRoundedRectPath } from "../elements/helper-functions/draw-rounded-rect"

export interface DrawRectParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  width: number
  height: number
  fill?: string
  realToCanvasMat: Matrix
  borderRadius?: number
  rotation?: number
  stroke?: string
  strokeWidth?: number
  isStrokeDashed?: boolean
}

export function drawRect(params: DrawRectParams): void {
  const {
    ctx,
    center,
    width,
    height,
    fill,
    realToCanvasMat,
    borderRadius = 0,
    rotation = 0,
    stroke,
    strokeWidth,
    isStrokeDashed = false,
  } = params

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledRadius = borderRadius * Math.abs(realToCanvasMat.a)
  const scaledStrokeWidth = strokeWidth
    ? strokeWidth * Math.abs(realToCanvasMat.a)
    : undefined

  ctx.beginPath()
  drawRoundedRectPath({
    ctx,
    cx,
    cy,
    width: scaledWidth,
    height: scaledHeight,
    radius: scaledRadius,
    ccwRotationDegrees: rotation,
  })

  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }

  if (stroke && scaledStrokeWidth) {
    ctx.save()
    // Set up dashed line if needed (after path is drawn, before stroke)
    if (isStrokeDashed) {
      ctx.setLineDash([scaledStrokeWidth * 3, scaledStrokeWidth * 2])
    } else {
      ctx.setLineDash([])
    }
    ctx.strokeStyle = stroke
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()
    ctx.restore()
  }
}
