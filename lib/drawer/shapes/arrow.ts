import type { CanvasContext } from "../types"

export interface DrawArrowHeadParams {
  ctx: CanvasContext
  x: number
  y: number
  angle: number
  size: number
  color: string
}

/**
 * Draw an arrow head at a point
 */
export function drawArrowHead(params: DrawArrowHeadParams): void {
  const { ctx, x, y, angle, size, color } = params

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2)
  ctx.lineTo(-size, size / 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  ctx.restore()
}
