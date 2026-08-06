import type { PcbCopperPour } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import { addBrepShapeToPath } from "../shapes/brep"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbCopperPourParams {
  ctx: CanvasContext
  pour: PcbCopperPour
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

export function drawPcbCopperPour(params: DrawPcbCopperPourParams): void {
  const { ctx, pour, realToCanvasMat, colorMap } = params

  const color = layerToColor(pour.layer, colorMap)
  const opacity = 0.5

  // Save context to apply opacity
  ctx.save()
  ctx.globalAlpha = opacity

  if (pour.shape === "rect") {
    // Draw the copper pour rectangle
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      pour.center.x,
      pour.center.y,
    ])
    const scaledWidth = pour.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = pour.height * Math.abs(realToCanvasMat.a)

    ctx.translate(cx, cy)

    if (pour.rotation) {
      ctx.rotate(-pour.rotation * (Math.PI / 180))
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
    return
  }

  if (pour.shape === "polygon") {
    if (pour.points && pour.points.length >= 3) {
      const canvasPoints = pour.points.map((p: { x: number; y: number }) =>
        applyToPoint(realToCanvasMat, [p.x, p.y]),
      )

      const firstPoint = canvasPoints[0]
      if (!firstPoint) {
        ctx.restore()
        return
      }

      ctx.beginPath()
      const [firstX, firstY] = firstPoint
      ctx.moveTo(firstX, firstY)

      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (!point) continue
        const [x, y] = point
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }
    ctx.restore()
    return
  }

  if (pour.shape === "brep") {
    ctx.beginPath()
    addBrepShapeToPath(ctx, pour.brep_shape, realToCanvasMat)

    ctx.fillStyle = color
    ctx.fill("evenodd")
    ctx.restore()
    return
  }

  ctx.restore()
}
