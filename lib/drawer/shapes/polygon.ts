import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

export interface DrawPolygonParams {
  ctx: CanvasContext
  points: Array<{ x: number; y: number }>
  fill: string
  realToCanvasMat: Matrix
  center?: { x: number; y: number }
  rotation?: number
}

export function drawPolygon(params: DrawPolygonParams): void {
  const {
    ctx,
    points,
    fill,
    realToCanvasMat,
    center = { x: 0, y: 0 },
    rotation = 0,
  } = params

  if (points.length < 3) return

  const canvasPoints = points.map((p) =>
    applyToPoint(realToCanvasMat, [p.x, p.y]),
  )

  const firstPoint = canvasPoints[0]
  if (!firstPoint) return
  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])

  ctx.save()
  ctx.translate(cx, cy)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.beginPath()
  const [firstX, firstY] = firstPoint
  ctx.moveTo(firstX - cx, firstY - cy)

  for (let i = 1; i < canvasPoints.length; i++) {
    const point = canvasPoints[i]
    if (!point) continue
    const [x, y] = point
    ctx.lineTo(x - cx, y - cy)
  }

  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}
