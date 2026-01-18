import type { PcbBoard } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawPath } from "../shapes/path"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbBoardParams {
  ctx: CanvasContext
  board: PcbBoard
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  showBoardFrontMaterial: boolean
}

export function drawPcbBoard(params: DrawPcbBoardParams): void {
  const { ctx, board, realToCanvasMat, colorMap, showBoardFrontMaterial } =
    params
  const { width, height, center, outline } = board

  // If the board has a custom outline, draw substrate and outline
  if (outline && Array.isArray(outline) && outline.length >= 3) {
    // Draw substrate fill only if showBoardFrontMaterial is true
    if (showBoardFrontMaterial) {
      drawPath({
        ctx,
        points: outline.map((p) => ({ x: p.x, y: p.y })),
        fill: colorMap.substrate,
        realToCanvasMat,
        closePath: true,
      })
    }

    // Always draw outline stroke
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
    // Draw substrate fill only if showBoardFrontMaterial is true
    if (showBoardFrontMaterial) {
      drawRect({
        ctx,
        center,
        width,
        height,
        fill: colorMap.substrate,
        realToCanvasMat,
      })
    }

    // Always draw the outline stroke separately using path
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
