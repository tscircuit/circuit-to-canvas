import type { PcbSmtPad } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawPill } from "../shapes/pill"
import { drawPolygon } from "../shapes/polygon"
import {
  drawSoldermaskRingForRect,
  drawSoldermaskRingForCircle,
  drawSoldermaskRingForPill,
  drawSoldermaskRingForPolygon,
  offsetPolygonPoints,
} from "./soldermask-margin"

export interface DrawPcbSmtPadParams {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

function getSoldermaskColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.soldermaskOverCopper[
      layer as keyof typeof colorMap.soldermaskOverCopper
    ] ?? colorMap.soldermaskOverCopper.top
  )
}

function getBorderRadius(pad: PcbSmtPad, margin = 0): number {
  return (
    ((pad as { corner_radius?: number }).corner_radius ??
      (pad as { rect_border_radius?: number }).rect_border_radius ??
      0) + margin
  )
}

export function drawPcbSmtPad(params: DrawPcbSmtPadParams): void {
  const { ctx, pad, realToCanvasMat, colorMap } = params

  const color = layerToColor(pad.layer, colorMap)
  const isCoveredWithSoldermask = pad.is_covered_with_solder_mask === true
  // If covered with soldermask, fully covered with no margin; otherwise use soldermask_margin if set
  const margin = isCoveredWithSoldermask ? 0 : (pad.soldermask_margin ?? 0)
  const hasSoldermask =
    !isCoveredWithSoldermask &&
    pad.soldermask_margin !== undefined &&
    pad.soldermask_margin !== 0
  const soldermaskRingColor = getSoldermaskColor(pad.layer, colorMap)
  const positiveMarginColor = colorMap.substrate
  const soldermaskOverlayColor = getSoldermaskColor(pad.layer, colorMap)

  // Draw the copper pad
  if (pad.shape === "rect") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width + margin * 2,
        height: pad.height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        borderRadius: getBorderRadius(pad),
      })
    }

    // Draw the pad on top
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      borderRadius: getBorderRadius(pad),
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: pad.x, y: pad.y },
        pad.width,
        pad.height,
        margin,
        getBorderRadius(pad),
        0,
        realToCanvasMat,
        soldermaskRingColor,
        color,
      )
    }

    // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
    if (isCoveredWithSoldermask && margin === 0) {
      drawRect({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width,
        height: pad.height,
        fill: soldermaskOverlayColor,
        realToCanvasMat,
        borderRadius: getBorderRadius(pad),
      })
    }
    return
  }

  if (pad.shape === "rotated_rect") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawRect({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width + margin * 2,
        height: pad.height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        borderRadius: getBorderRadius(pad),
        rotation: pad.ccw_rotation ?? 0,
      })
    }

    // Draw the pad on top
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      borderRadius: getBorderRadius(pad),
      rotation: pad.ccw_rotation ?? 0,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForRect(
        ctx,
        { x: pad.x, y: pad.y },
        pad.width,
        pad.height,
        margin,
        getBorderRadius(pad),
        pad.ccw_rotation ?? 0,
        realToCanvasMat,
        soldermaskRingColor,
        color,
      )
    }

    // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
    if (isCoveredWithSoldermask && margin === 0) {
      drawRect({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width,
        height: pad.height,
        fill: soldermaskOverlayColor,
        realToCanvasMat,
        borderRadius: getBorderRadius(pad),
        rotation: pad.ccw_rotation ?? 0,
      })
    }
    return
  }

  if (pad.shape === "circle") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawCircle({
        ctx,
        center: { x: pad.x, y: pad.y },
        radius: pad.radius + margin,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the pad on top
    drawCircle({
      ctx,
      center: { x: pad.x, y: pad.y },
      radius: pad.radius,
      fill: color,
      realToCanvasMat,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForCircle(
        ctx,
        { x: pad.x, y: pad.y },
        pad.radius,
        margin,
        realToCanvasMat,
        soldermaskRingColor,
        color,
      )
    }

    // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
    if (isCoveredWithSoldermask && margin === 0) {
      drawCircle({
        ctx,
        center: { x: pad.x, y: pad.y },
        radius: pad.radius,
        fill: soldermaskOverlayColor,
        realToCanvasMat,
      })
    }
    return
  }

  if (pad.shape === "pill") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawPill({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width + margin * 2,
        height: pad.height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
      })
    }

    // Draw the pad on top
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForPill(
        ctx,
        { x: pad.x, y: pad.y },
        pad.width,
        pad.height,
        margin,
        0,
        realToCanvasMat,
        soldermaskRingColor,
        color,
      )
    }

    // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
    if (isCoveredWithSoldermask && margin === 0) {
      drawPill({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width,
        height: pad.height,
        fill: soldermaskOverlayColor,
        realToCanvasMat,
      })
    }
    return
  }

  if (pad.shape === "rotated_pill") {
    // For positive margins, draw extended mask area first
    if (hasSoldermask && margin > 0) {
      drawPill({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width + margin * 2,
        height: pad.height + margin * 2,
        fill: positiveMarginColor,
        realToCanvasMat,
        rotation: pad.ccw_rotation ?? 0,
      })
    }

    // Draw the pad on top
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      fill: color,
      realToCanvasMat,
      rotation: pad.ccw_rotation ?? 0,
    })

    // For negative margins, draw soldermask ring on top of the pad
    if (hasSoldermask && margin < 0) {
      drawSoldermaskRingForPill(
        ctx,
        { x: pad.x, y: pad.y },
        pad.width,
        pad.height,
        margin,
        pad.ccw_rotation ?? 0,
        realToCanvasMat,
        soldermaskRingColor,
        color,
      )
    }

    // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
    if (isCoveredWithSoldermask && margin === 0) {
      drawPill({
        ctx,
        center: { x: pad.x, y: pad.y },
        width: pad.width,
        height: pad.height,
        fill: soldermaskOverlayColor,
        realToCanvasMat,
        rotation: pad.ccw_rotation ?? 0,
      })
    }
    return
  }

  if (pad.shape === "polygon") {
    if (pad.points && pad.points.length >= 3) {
      // For positive margins, draw extended mask area first
      if (hasSoldermask && margin > 0) {
        const expandedPoints = offsetPolygonPoints(pad.points, margin)
        drawPolygon({
          ctx,
          points: expandedPoints,
          fill: positiveMarginColor,
          realToCanvasMat,
        })
      }

      // Draw the copper pad
      drawPolygon({
        ctx,
        points: pad.points,
        fill: color,
        realToCanvasMat,
      })

      // For negative margins, draw soldermask ring on top of the pad
      if (hasSoldermask && margin < 0) {
        drawSoldermaskRingForPolygon(
          ctx,
          pad.points,
          margin,
          realToCanvasMat,
          soldermaskRingColor,
          color,
        )
      }

      // If covered with soldermask and margin == 0 (treat as 0 positive margin), draw soldermaskOverCopper overlay
      if (isCoveredWithSoldermask && margin === 0) {
        drawPolygon({
          ctx,
          points: pad.points,
          fill: soldermaskOverlayColor,
          realToCanvasMat,
        })
      }
    }
    return
  }
}
