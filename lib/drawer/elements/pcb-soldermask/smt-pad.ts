import type { PcbSmtPad } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"
import {
  drawPillPath,
  drawPolygonPath,
  drawRoundedRectPath,
} from "../helper-functions/draw-paths"
import { offsetPolygonPoints } from "../soldermask-margin"

/**
 * Process soldermask for an SMT pad.
 */
export function processSmtPadSoldermask(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
  layer: "top" | "bottom",
): void {
  // Only process pads on the current layer
  if (pad.layer !== layer) return

  const isCoveredWithSoldermask = pad.is_covered_with_solder_mask === true
  const margin = pad.soldermask_margin ?? 0

  // Get asymmetric margins for rect shapes
  let ml = margin
  let mr = margin
  let mt = margin
  let mb = margin

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    ml = pad.soldermask_margin_left ?? margin
    mr = pad.soldermask_margin_right ?? margin
    mt = pad.soldermask_margin_top ?? margin
    mb = pad.soldermask_margin_bottom ?? margin
  }

  const copperColor =
    colorMap.copper[pad.layer as keyof typeof colorMap.copper] ||
    colorMap.copper.top

  if (isCoveredWithSoldermask) {
    // Draw light green over the entire pad
    ctx.fillStyle = soldermaskOverCopperColor
    drawPadShapePath(ctx, pad, realToCanvasMat, 0, 0, 0, 0)
    ctx.fill()
  } else if (ml < 0 || mr < 0 || mt < 0 || mb < 0) {
    // Negative margin: draw full copper pad, then light green ring
    ctx.fillStyle = copperColor
    drawPadShapePath(ctx, pad, realToCanvasMat, 0, 0, 0, 0)
    ctx.fill()
    // Draw light green ring for negative margin
    drawNegativeMarginRingForPad(
      ctx,
      pad,
      realToCanvasMat,
      soldermaskOverCopperColor,
      ml,
      mr,
      mt,
      mb,
    )
  } else if (ml > 0 || mr > 0 || mt > 0 || mb > 0) {
    // Positive margin: draw substrate for larger area, then copper for pad
    ctx.fillStyle = colorMap.substrate
    drawPadShapePath(ctx, pad, realToCanvasMat, ml, mr, mt, mb)
    ctx.fill()
    ctx.fillStyle = copperColor
    drawPadShapePath(ctx, pad, realToCanvasMat, 0, 0, 0, 0)
    ctx.fill()
  } else {
    // Zero margin: just draw copper for the pad
    ctx.fillStyle = copperColor
    drawPadShapePath(ctx, pad, realToCanvasMat, 0, 0, 0, 0)
    ctx.fill()
  }
}

function drawPadShapePath(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
  ml: number,
  mr: number,
  mt: number,
  mb: number,
): void {
  const rotation =
    pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
      ? (pad.ccw_rotation ?? 0)
      : 0

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const borderRadius = pad.corner_radius ?? pad.rect_border_radius ?? 0
    const radians = (rotation * Math.PI) / 180
    const dxLocal = (mr - ml) / 2
    const dyLocal = (mt - mb) / 2
    const dxGlobal = dxLocal * Math.cos(radians) - dyLocal * Math.sin(radians)
    const dyGlobal = dxLocal * Math.sin(radians) + dyLocal * Math.cos(radians)

    const [cx, cy] = applyToPoint(realToCanvasMat, [
      pad.x + dxGlobal,
      pad.y + dyGlobal,
    ])
    const scaledWidth = (pad.width + ml + mr) * Math.abs(realToCanvasMat.a)
    const scaledHeight = (pad.height + mt + mb) * Math.abs(realToCanvasMat.a)
    const scaledRadius = borderRadius * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, scaledRadius)
    ctx.restore()
  } else if (pad.shape === "circle") {
    const avgMargin = (ml + mr + mt + mb) / 4
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledRadius = (pad.radius + avgMargin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const avgMargin = (ml + mr) / 2
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledWidth =
      (pad.width + avgMargin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (pad.height + avgMargin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)
    ctx.restore()
  } else if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    const avgMargin = (ml + mr + mt + mb) / 4
    const points =
      avgMargin !== 0 ? offsetPolygonPoints(pad.points, avgMargin) : pad.points
    const canvasPoints = points.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath(ctx, canvasPoints)
  }
}

function drawNegativeMarginRingForPad(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
  soldermaskOverCopperColor: string,
  ml: number,
  mr: number,
  mt: number,
  mb: number,
): void {
  const rotation =
    pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
      ? (pad.ccw_rotation ?? 0)
      : 0

  // Calculate the inner dimensions (where copper is exposed)
  const thicknessL = Math.max(0, -ml)
  const thicknessR = Math.max(0, -mr)
  const thicknessT = Math.max(0, -mt)
  const thicknessB = Math.max(0, -mb)

  ctx.fillStyle = soldermaskOverCopperColor

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const borderRadius = pad.corner_radius ?? pad.rect_border_radius ?? 0
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledWidth = pad.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = pad.height * Math.abs(realToCanvasMat.a)
    const scaledRadius = borderRadius * Math.abs(realToCanvasMat.a)
    const scaledThicknessL = thicknessL * Math.abs(realToCanvasMat.a)
    const scaledThicknessR = thicknessR * Math.abs(realToCanvasMat.a)
    const scaledThicknessT = thicknessT * Math.abs(realToCanvasMat.a)
    const scaledThicknessB = thicknessB * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    // Draw outer rectangle (full pad size)
    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, scaledRadius)

    // Create inner cutout
    const innerWidth = scaledWidth - scaledThicknessL - scaledThicknessR
    const innerHeight = scaledHeight - scaledThicknessT - scaledThicknessB
    const innerOffsetX = (scaledThicknessL - scaledThicknessR) / 2
    const innerOffsetY = (scaledThicknessT - scaledThicknessB) / 2
    const innerRadius = Math.max(
      0,
      scaledRadius -
        (scaledThicknessL +
          scaledThicknessR +
          scaledThicknessT +
          scaledThicknessB) /
          4,
    )

    if (innerWidth > 0 && innerHeight > 0) {
      drawRoundedRectPath(
        ctx,
        innerOffsetX,
        innerOffsetY,
        innerWidth,
        innerHeight,
        innerRadius,
      )
    }

    ctx.fill("evenodd")
    ctx.restore()
  } else if (pad.shape === "circle") {
    const thickness = Math.max(thicknessL, thicknessR, thicknessT, thicknessB)
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledRadius = pad.radius * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadius = Math.max(0, scaledRadius - scaledThickness)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const thickness = Math.max(thicknessL, thicknessR, thicknessT, thicknessB)
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledWidth = pad.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = pad.height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    // Draw outer pill
    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)

    // Draw inner pill cutout
    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      drawPillPath(ctx, 0, 0, innerWidth, innerHeight)
    }

    ctx.fill("evenodd")
    ctx.restore()
  }
}
