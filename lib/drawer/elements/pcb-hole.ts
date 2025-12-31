import type { PCBHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"

export interface DrawPcbHoleParams {
  ctx: CanvasContext
  hole: PCBHole
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbHole(params: DrawPcbHoleParams): void {
  const { ctx, hole, realToCanvasMat, colorMap } = params

  const hasSoldermask =
    hole.is_covered_with_solder_mask === true &&
    hole.soldermask_margin !== undefined &&
    hole.soldermask_margin > 0
  const margin = hasSoldermask ? hole.soldermask_margin! : 0
  const positiveMarginColor = colorMap.substrate

  if (hole.hole_shape === "circle") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawCircle({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius: hole.hole_diameter / 2 + margin,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the hole
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "square") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_diameter + margin * 2,
        height: hole.hole_diameter + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the hole
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_diameter,
      height: hole.hole_diameter,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "oval") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawOval({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius_x: hole.hole_width / 2 + margin,
        radius_y: hole.hole_height / 2 + margin,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the hole
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2,
      radius_y: hole.hole_height / 2,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "rect") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_width + margin * 2,
        height: hole.hole_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the hole
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "pill") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_width + margin * 2,
        height: hole.hole_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the hole
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "rotated_pill") {
    const rotation = (hole as any).ccw_rotation ?? 0

    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_width + margin * 2,
        height: hole.hole_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        rotation,
      })
    }

    // Draw the hole
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation,
    })
    return
  }
}
