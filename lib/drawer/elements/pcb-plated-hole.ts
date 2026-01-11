import type { PcbPlatedHole } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"
import { drawPolygon } from "../shapes/polygon"
import {
  drawSoldermaskRingForCircle,
  drawSoldermaskRingForOval,
  drawSoldermaskRingForPill,
  drawSoldermaskRingForRect,
} from "./soldermask-margin"

export interface DrawPcbPlatedHoleParams {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function getSoldermaskColor(
  layers: string[] | undefined,
  colorMap: PcbColorMap,
): string {
  const layer = layers?.includes("top") ? "top" : "bottom"
  return (
    colorMap.soldermaskOverCopper[
      layer as keyof typeof colorMap.soldermaskOverCopper
    ] ?? colorMap.soldermaskOverCopper.top
  )
}

export function drawPcbPlatedHole(params: DrawPcbPlatedHoleParams): void {
  const { ctx, hole, realToCanvasMat, colorMap } = params

  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = isCoveredWithSoldermask ? 0 : (hole.soldermask_margin ?? 0)
  const hasSoldermask =
    !isCoveredWithSoldermask &&
    hole.soldermask_margin !== undefined &&
    hole.soldermask_margin !== 0
  const soldermaskRingColor = getSoldermaskColor(hole.layers, colorMap)
  const positiveMarginColor = colorMap.substrate
  const copperColor = colorMap.copper.top

  if (hole.shape === "circle") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawCircle({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius: hole.outer_diameter / 2 + margin,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw outer copper ring
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.outer_diameter / 2,
      fill: copperColor,
      realToCanvasMat,
    })

    // For negative margins, draw soldermask ring on top of the copper ring
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForCircle(
        ctx,
        { x: hole.x, y: hole.y },
        hole.outer_diameter / 2,
        margin,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawCircle({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius: hole.outer_diameter / 2,
        fill: soldermaskRingColor,
        realToCanvasMat,
      })
    }

    // Draw inner drill hole (only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      drawCircle({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius: hole.hole_diameter / 2,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    }
    return
  }

  if (hole.shape === "oval") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawOval({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius_x: hole.outer_width / 2 + margin,
        radius_y: hole.outer_height / 2 + margin,
        fill: positiveMarginColor,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }

    // Draw outer copper oval
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.outer_width / 2,
      radius_y: hole.outer_height / 2,
      fill: copperColor,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })

    // For negative margins, draw soldermask ring on top of the copper oval
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForOval(
        ctx,
        { x: hole.x, y: hole.y },
        hole.outer_width / 2,
        hole.outer_height / 2,
        margin,
        hole.ccw_rotation ?? 0,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawOval({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius_x: hole.outer_width / 2,
        radius_y: hole.outer_height / 2,
        fill: soldermaskRingColor,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }

    // Draw inner drill hole (only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      drawOval({
        ctx,
        center: { x: hole.x, y: hole.y },
        radius_x: hole.hole_width / 2,
        radius_y: hole.hole_height / 2,
        fill: colorMap.drill,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }
    return
  }

  if (hole.shape === "pill") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.outer_width + margin * 2,
        height: hole.outer_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }

    // Draw outer copper pill
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.outer_width,
      height: hole.outer_height,
      fill: copperColor,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })

    // For negative margins, draw soldermask ring on top of the copper pill
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForPill(
        ctx,
        { x: hole.x, y: hole.y },
        hole.outer_width,
        hole.outer_height,
        margin,
        hole.ccw_rotation ?? 0,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.outer_width,
        height: hole.outer_height,
        fill: soldermaskRingColor,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }

    // Draw inner drill hole (only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      drawPill({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: colorMap.drill,
        realToCanvasMat,
        rotation: hole.ccw_rotation,
      })
    }
    return
  }

  if (hole.shape === "circular_hole_with_rect_pad") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width + margin * 2,
        height: hole.rect_pad_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        borderRadius: (hole.rect_border_radius ?? 0) + margin,
      })
    }

    // Draw rectangular pad
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius ?? 0,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: hole.x, y: hole.y },
        hole.rect_pad_width,
        hole.rect_pad_height,
        margin,
        hole.rect_border_radius ?? 0,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width,
        height: hole.rect_pad_height,
        fill: soldermaskRingColor,
        realToCanvasMat,
        borderRadius: hole.rect_border_radius ?? 0,
      })
    }

    // Draw circular drill hole (with offset, only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      const holeX = hole.x + (hole.hole_offset_x ?? 0)
      const holeY = hole.y + (hole.hole_offset_y ?? 0)
      drawCircle({
        ctx,
        center: { x: holeX, y: holeY },
        radius: hole.hole_diameter / 2,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    }
    return
  }

  if (hole.shape === "pill_hole_with_rect_pad") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width + margin * 2,
        height: hole.rect_pad_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        borderRadius: (hole.rect_border_radius ?? 0) + margin,
      })
    }

    // Draw rectangular pad
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius ?? 0,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: hole.x, y: hole.y },
        hole.rect_pad_width,
        hole.rect_pad_height,
        margin,
        hole.rect_border_radius ?? 0,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width,
        height: hole.rect_pad_height,
        fill: soldermaskRingColor,
        realToCanvasMat,
        borderRadius: hole.rect_border_radius ?? 0,
      })
    }

    // Draw pill drill hole (with offset, only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      const holeX = hole.x + (hole.hole_offset_x ?? 0)
      const holeY = hole.y + (hole.hole_offset_y ?? 0)
      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: colorMap.drill,
        realToCanvasMat,
      })
    }
    return
  }

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width + margin * 2,
        height: hole.rect_pad_height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        borderRadius: (hole.rect_border_radius ?? 0) + margin,
        rotation: hole.rect_ccw_rotation,
      })
    }

    // Draw rotated rectangular pad
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      fill: copperColor,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius ?? 0,
      rotation: hole.rect_ccw_rotation,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: hole.x, y: hole.y },
        hole.rect_pad_width,
        hole.rect_pad_height,
        margin,
        hole.rect_border_radius ?? 0,
        hole.rect_ccw_rotation ?? 0,
        realToCanvasMat,
        soldermaskRingColor,
        copperColor,
      )
    }

    // If fully covered, draw soldermask overlay
    if (isCoveredWithSoldermask) {
      drawRect({
        ctx,
        center: { x: hole.x, y: hole.y },
        width: hole.rect_pad_width,
        height: hole.rect_pad_height,
        fill: soldermaskRingColor,
        realToCanvasMat,
        borderRadius: hole.rect_border_radius ?? 0,
        rotation: hole.rect_ccw_rotation,
      })
    }

    // Draw rotated pill drill hole (with offset, only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      const holeX = hole.x + (hole.hole_offset_x ?? 0)
      const holeY = hole.y + (hole.hole_offset_y ?? 0)
      drawPill({
        ctx,
        center: { x: holeX, y: holeY },
        width: hole.hole_width,
        height: hole.hole_height,
        fill: colorMap.drill,
        realToCanvasMat,
        rotation: hole.hole_ccw_rotation,
      })
    }
    return
  }

  if (hole.shape === "hole_with_polygon_pad") {
    // Note: Polygon pads don't support soldermask margins (similar to SMT polygon pads)
    // Draw polygon pad
    const padOutline = hole.pad_outline
    if (padOutline && padOutline.length >= 3) {
      // Transform pad_outline points to be relative to hole.x, hole.y
      const padPoints = padOutline.map((point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }))
      drawPolygon({
        ctx,
        points: padPoints,
        fill: copperColor,
        realToCanvasMat,
      })
    }

    // Draw drill hole (with offset, only if not fully covered with soldermask)
    if (!isCoveredWithSoldermask) {
      const holeX = hole.x + (hole.hole_offset_x ?? 0)
      const holeY = hole.y + (hole.hole_offset_y ?? 0)
      const holeShape = hole.hole_shape

      if (holeShape === "circle") {
        drawCircle({
          ctx,
          center: { x: holeX, y: holeY },
          radius: (hole.hole_diameter ?? 0) / 2,
          fill: colorMap.drill,
          realToCanvasMat,
        })
      } else if (holeShape === "oval") {
        drawOval({
          ctx,
          center: { x: holeX, y: holeY },
          radius_x: (hole.hole_width ?? 0) / 2,
          radius_y: (hole.hole_height ?? 0) / 2,
          fill: colorMap.drill,
          realToCanvasMat,
        })
      } else if (holeShape === "pill") {
        drawPill({
          ctx,
          center: { x: holeX, y: holeY },
          width: hole.hole_width ?? 0,
          height: hole.hole_height ?? 0,
          fill: colorMap.drill,
          realToCanvasMat,
        })
      } else if (holeShape === "rotated_pill") {
        drawPill({
          ctx,
          center: { x: holeX, y: holeY },
          width: hole.hole_width ?? 0,
          height: hole.hole_height ?? 0,
          fill: colorMap.drill,
          realToCanvasMat,
        })
      }
    }
    return
  }
}
