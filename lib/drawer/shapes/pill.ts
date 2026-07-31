import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawPillParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  width: number
  height: number
  /** Corner radius. Defaults to half of the shorter side. */
  radius?: number
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
    radius,
    fill,
    realToCanvasMat,
    rotation = 0,
    stroke,
    strokeWidth,
  } = params

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledRadius = Math.max(
    0,
    Math.min(
      (radius ?? Math.min(width, height) / 2) * Math.abs(realToCanvasMat.a),
      scaledWidth / 2,
      scaledHeight / 2,
    ),
  )
  const scaledStrokeWidth = strokeWidth
    ? strokeWidth * Math.abs(realToCanvasMat.a)
    : undefined

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.beginPath()

  if (scaledRadius > 0) {
    const x = -scaledWidth / 2
    const y = -scaledHeight / 2

    ctx.moveTo(x + scaledRadius, y)
    ctx.lineTo(x + scaledWidth - scaledRadius, y)
    ctx.arcTo(
      x + scaledWidth,
      y,
      x + scaledWidth,
      y + scaledRadius,
      scaledRadius,
    )
    ctx.lineTo(x + scaledWidth, y + scaledHeight - scaledRadius)
    ctx.arcTo(
      x + scaledWidth,
      y + scaledHeight,
      x + scaledWidth - scaledRadius,
      y + scaledHeight,
      scaledRadius,
    )
    ctx.lineTo(x + scaledRadius, y + scaledHeight)
    ctx.arcTo(
      x,
      y + scaledHeight,
      x,
      y + scaledHeight - scaledRadius,
      scaledRadius,
    )
    ctx.lineTo(x, y + scaledRadius)
    ctx.arcTo(x, y, x + scaledRadius, y, scaledRadius)
  } else {
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  }

  ctx.closePath()

  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }

  if (stroke && scaledStrokeWidth) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()
  }

  ctx.restore()
}
