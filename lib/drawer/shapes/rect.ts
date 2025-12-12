import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawRectParams {
  ctx: CanvasContext
  center: { x: number; y: number }
  width: number
  height: number
  fill?: string
  transform: Matrix
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
    transform,
    borderRadius = 0,
    rotation = 0,
    stroke,
    strokeWidth,
    isStrokeDashed = false,
  } = params

  const [cx, cy] = applyToPoint(transform, [center.x, center.y])
  const scaledWidth = width * Math.abs(transform.a)
  const scaledHeight = height * Math.abs(transform.a)
  const scaledRadius = borderRadius * Math.abs(transform.a)
  const scaledStrokeWidth = strokeWidth
    ? strokeWidth * Math.abs(transform.a)
    : undefined

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  // Set up dashed line if needed
  if (isStrokeDashed && scaledStrokeWidth) {
    ctx.setLineDash([scaledStrokeWidth * 2, scaledStrokeWidth * 2])
  } else {
    ctx.setLineDash([])
  }

  ctx.beginPath()

  if (scaledRadius > 0) {
    const x = -scaledWidth / 2
    const y = -scaledHeight / 2
    const r = Math.min(scaledRadius, scaledWidth / 2, scaledHeight / 2)

    ctx.moveTo(x + r, y)
    ctx.lineTo(x + scaledWidth - r, y)
    ctx.arcTo(x + scaledWidth, y, x + scaledWidth, y + r, r)
    ctx.lineTo(x + scaledWidth, y + scaledHeight - r)
    ctx.arcTo(
      x + scaledWidth,
      y + scaledHeight,
      x + scaledWidth - r,
      y + scaledHeight,
      r,
    )
    ctx.lineTo(x + r, y + scaledHeight)
    ctx.arcTo(x, y + scaledHeight, x, y + scaledHeight - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  } else {
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  }

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
