import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawPillPath } from "../elements/helper-functions/draw-pill"

export interface DrawPillParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  width: number
  height: number
  fill?: string
  realToCanvasMat: Matrix
  rotation?: number
  stroke?: string
  strokeWidth?: number
}

export function drawPill(params: DrawPillParams): void {
  const {
    ctx,
    center,
    width,
    height,
    fill,
    realToCanvasMat,
    rotation = 0,
    stroke,
    strokeWidth,
  } = params

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledStrokeWidth = strokeWidth
    ? strokeWidth * Math.abs(realToCanvasMat.a)
    : undefined

  ctx.beginPath()
  drawPillPath({
    ctx,
    cx,
    cy,
    width: scaledWidth,
    height: scaledHeight,
    ccwRotationDegrees: rotation,
  })

  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }

  if (stroke && scaledStrokeWidth) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()
  }
}
