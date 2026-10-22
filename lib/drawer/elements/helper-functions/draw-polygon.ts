import type { CanvasContext } from "../../types"
import { applyToPoint, compose, rotate, translate } from "transformation-matrix"

/**
 * Draws a polygon path from an array of points.
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPolygonPath(params: {
  ctx: CanvasContext
  points: Array<{ x: number; y: number }>
  cx?: number
  cy?: number
  ccwRotationDegrees?: number
}): void {
  const { ctx, points, cx = 0, cy = 0, ccwRotationDegrees = 0 } = params
  const firstPoint = points[0]
  if (points.length < 3 || !firstPoint) return

  const transform = compose(
    translate(cx, cy),
    rotate((-ccwRotationDegrees * Math.PI) / 180),
    translate(-cx, -cy),
  )
  const first = applyToPoint(transform, firstPoint)
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < points.length; i++) {
    const point = points[i]
    if (!point) continue
    const rotatedPoint = applyToPoint(transform, point)
    ctx.lineTo(rotatedPoint.x, rotatedPoint.y)
  }
  ctx.closePath()
}
