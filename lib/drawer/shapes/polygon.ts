import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawPolygonPath } from "../elements/helper-functions/draw-polygon"

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

  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const canvasPoints = points.map((point) => {
    const [x, y] = applyToPoint(realToCanvasMat, [point.x, point.y])
    return { x: x - cx, y: y - cy }
  })
  if (!canvasPoints[0]) return

  ctx.save()
  ctx.translate(cx, cy)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.beginPath()
  drawPolygonPath({ ctx, points: canvasPoints })
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}
