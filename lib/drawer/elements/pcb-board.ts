import type { PcbBoard } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPath } from "../shapes/path"
import { drawRect } from "../shapes/rect"

export interface DrawPcbBoardParams {
  ctx: CanvasContext
  board: PcbBoard
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbBoard(params: DrawPcbBoardParams): void {
  const { ctx, board, realToCanvasMat, colorMap } = params
  const { width, height, center, outline } = board

  // If the board has a custom outline, draw substrate and outline
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    // Draw substrate fill
    drawPath({
      ctx,
      points: outline.map((p) => ({ x: p.x, y: p.y })),
      fill: colorMap.substrate,
      realToCanvasMat,
      closePath: true,
    })

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
    // Draw substrate fill
    drawRect({
      ctx,
      center,
      width,
      height,
      fill: colorMap.substrate,
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
