import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawPolygonParams {
  ctx: CanvasContext
  points: Array<{ x: number; y: number }>
  fill: string
  transform: Matrix
}

export function drawPolygon(params: DrawPolygonParams): void {
  const { ctx, points, fill, transform } = params

  if (points.length < 3) return

  ctx.beginPath()

  const transformedPoints = points.map((p) =>
    applyToPoint(transform, [p.x, p.y]),
  )

  const firstPoint = transformedPoints[0]
  if (!firstPoint) return
  const [firstX, firstY] = firstPoint
  ctx.moveTo(firstX, firstY)

  for (let i = 1; i < transformedPoints.length; i++) {
    const point = transformedPoints[i]
    if (!point) continue
    const [x, y] = point
    ctx.lineTo(x, y)
  }

  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}
