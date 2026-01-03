import type { PcbBoard } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPath } from "../shapes/path"
import { drawRect } from "../shapes/rect"

export interface DrawPcbBoardParams {
  ctx: CanvasContext
  board: PcbBoard
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  withSoldermask?: boolean
}

export function drawPcbBoard(params: DrawPcbBoardParams): void {
  const {
    ctx,
    board,
    realToCanvasMat,
    colorMap,
    withSoldermask = false,
  } = params
  const { width, height, center, outline } = board

  const layer = "top" // Default to top layer for soldermask color
  const soldermaskColor =
    colorMap.soldermask[layer as keyof typeof colorMap.soldermask]

  // If the board has a custom outline, draw it as a path
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    if (withSoldermask) {
      // Draw filled path
      const canvasPoints = outline.map((p) => {
        const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
        return { x, y }
      })

      ctx.beginPath()
      const firstPoint = canvasPoints[0]
      if (firstPoint) {
        ctx.moveTo(firstPoint.x, firstPoint.y)
        for (let i = 1; i < canvasPoints.length; i++) {
          const point = canvasPoints[i]
          if (point) {
            ctx.lineTo(point.x, point.y)
          }
        }
        ctx.closePath()
      }

      ctx.fillStyle = soldermaskColor
      ctx.fill()
    }

    // Draw outline stroke
    drawPath({
      ctx,
      points: outline.map((p) => ({ x: p.x, y: p.y })),
      stroke: colorMap.boardOutline,
      strokeWidth: 0.1,
      realToCanvasMat,
      closePath: true,
    })
    return
  }

  // Otherwise draw a rectangle
  if (width !== undefined && height !== undefined && center) {
    // Draw filled rectangle if withSoldermask is true
    drawRect({
      ctx,
      center,
      width,
      height,
      fill: withSoldermask ? soldermaskColor : "transparent",
      realToCanvasMat,
    })

    // Draw the outline stroke separately using path
    const halfWidth = width / 2
    const halfHeight = height / 2
    const corners = [
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + halfHeight },
    ]

    drawPath({
      ctx,
      points: corners,
      stroke: colorMap.boardOutline,
      strokeWidth: 0.1,
      realToCanvasMat,
      closePath: true,
    })
  }
}
