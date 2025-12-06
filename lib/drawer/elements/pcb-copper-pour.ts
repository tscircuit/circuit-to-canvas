import type { PcbCopperPour } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"
import { drawPolygon } from "../shapes/polygon"

export interface DrawPcbCopperPourParams {
  ctx: CanvasContext
  pour: PcbCopperPour
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

export function drawPcbCopperPour(params: DrawPcbCopperPourParams): void {
  const { ctx, pour, transform, colorMap } = params

  const color = layerToColor(pour.layer, colorMap)

  // Save context to apply opacity
  ctx.save()

  if (pour.shape === "rect") {
    // Draw the copper pour rectangle with 50% opacity
    const [cx, cy] = applyToPoint(transform, [pour.center.x, pour.center.y])
    const scaledWidth = pour.width * Math.abs(transform.a)
    const scaledHeight = pour.height * Math.abs(transform.a)

    ctx.translate(cx, cy)

    if (pour.rotation) {
      ctx.rotate(-pour.rotation * (Math.PI / 180))
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.fillStyle = color
    ;(ctx as any).globalAlpha = 0.5
    ctx.fill()
    ctx.restore()
    return
  }

  if (pour.shape === "polygon") {
    if (pour.points && pour.points.length >= 3) {
      const transformedPoints = pour.points.map((p) =>
        applyToPoint(transform, [p.x, p.y]),
      )

      const firstPoint = transformedPoints[0]
      if (!firstPoint) {
        ctx.restore()
        return
      }

      ctx.beginPath()
      const [firstX, firstY] = firstPoint
      ctx.moveTo(firstX, firstY)

      for (let i = 1; i < transformedPoints.length; i++) {
        const point = transformedPoints[i]
        if (!point) continue
        const [x, y] = point
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.fillStyle = color
      ;(ctx as any).globalAlpha = 0.5
      ctx.fill()
    }
    ctx.restore()
    return
  }

  ctx.restore()
}
