import type { PCBHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"
import {
  drawSoldermaskRingForRect,
  drawSoldermaskRingForCircle,
  drawSoldermaskRingForPill,
  drawSoldermaskRingForOval,
} from "./soldermask-margin"

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
    hole.soldermask_margin !== 0
  const margin = hasSoldermask ? hole.soldermask_margin! : 0
  const soldermaskRingColor = colorMap.soldermaskOverCopper.top
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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForCircle(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_diameter / 2,
        margin,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_diameter,
        hole.hole_diameter,
        margin,
        0,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForOval(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_width / 2,
        hole.hole_height / 2,
        margin,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_width,
        hole.hole_height,
        margin,
        0,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForPill(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_width,
        hole.hole_height,
        margin,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
    return
  }

  if (hole.hole_shape === "rotated_pill") {
    const rotation = hole.ccw_rotation ?? 0

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

    // For negative margins, draw soldermask ring on top of the hole
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForPill(
        ctx,
        { x: hole.x, y: hole.y },
        hole.hole_width,
        hole.hole_height,
        margin,
        rotation,
        realToCanvasMat,
        soldermaskRingColor,
        colorMap.drill,
      )
    }
    return
  }
}
