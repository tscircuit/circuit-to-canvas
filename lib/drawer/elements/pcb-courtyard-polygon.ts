import type { PcbCourtyardPolygon } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbCourtyardPolygonParams {
  ctx: CanvasContext
  polygon: PcbCourtyardPolygon
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToCourtyardColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom" ? colorMap.courtyard.bottom : colorMap.courtyard.top
}

export function drawPcbCourtyardPolygon(
  params: DrawPcbCourtyardPolygonParams,
): void {
  const { ctx, polygon, realToCanvasMat, colorMap } = params

  if (!polygon.points || polygon.points.length < 3) return

  ctx.save()
  ctx.beginPath()

  const startPoint = applyToPoint(
    realToCanvasMat,
    polygon.points[0] as { x: number; y: number },
  ) as { x: number; y: number }
  ctx.moveTo(startPoint.x, startPoint.y)

  for (let i = 1; i < polygon.points.length; i++) {
    const point = applyToPoint(
      realToCanvasMat,
      polygon.points[i] as { x: number; y: number },
    ) as { x: number; y: number }
    ctx.lineTo(point.x, point.y)
  }

  ctx.closePath()
  ctx.lineWidth = 0.05 * Math.abs(realToCanvasMat.a)
  ctx.strokeStyle =
    polygon.color ?? layerToCourtyardColor(polygon.layer, colorMap)
  ctx.lineJoin = "round"
  ctx.stroke()
  ctx.restore()
}
