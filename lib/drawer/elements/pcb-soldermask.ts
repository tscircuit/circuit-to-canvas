import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCopperPour,
  PcbCutout,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import { drawLine } from "../shapes/line"
import { drawOval } from "../shapes/oval"
import { drawPath } from "../shapes/path"
import { drawPill } from "../shapes/pill"
import { drawPolygon } from "../shapes/polygon"
import { drawRect } from "../shapes/rect"
import type { CanvasContext, PcbColorMap } from "../types"
import { offsetPolygonPoints } from "./soldermask-margin"

export interface DrawPcbSoldermaskParams {
  ctx: CanvasContext
  board: PcbBoard
  elements: AnyCircuitElement[]
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer: "top" | "bottom"
}

/**
 * Draws the soldermask layer for the PCB.
 *
 * The soldermask covers the entire board by default. Elements are either:
 * 1. Cut out from the soldermask (exposing copper/substrate underneath) - default behavior
 * 2. Covered with a lighter green soldermask if is_covered_with_solder_mask is true
 *
 * Soldermask margin behavior:
 * - Positive margin: creates clearance around the element (larger cutout)
 * - Negative margin: covers the element edges with lighter green soldermask
 */
export function drawPcbSoldermask(params: DrawPcbSoldermaskParams): void {
  const { ctx, board, elements, realToCanvasMat, colorMap, layer } = params

  const soldermaskColor = colorMap.soldermask[layer] ?? colorMap.soldermask.top
  const soldermaskOverCopperColor =
    colorMap.soldermaskOverCopper[layer] ?? colorMap.soldermaskOverCopper.top

  // Step 1: Draw the full soldermask covering the board
  drawBoardSoldermask(ctx, board, realToCanvasMat, soldermaskColor)

  // Step 2: Cut out elements from the soldermask (or cover with lighter green)
  for (const element of elements) {
    processSoldermaskForElement(
      ctx,
      element,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
    )
  }
}

function drawBoardSoldermask(
  ctx: CanvasContext,
  board: PcbBoard,
  realToCanvasMat: Matrix,
  soldermaskColor: string,
): void {
  const { width, height, center, outline } = board

  if (outline && Array.isArray(outline) && outline.length >= 3) {
    // Draw filled polygon for custom outline
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
  } else if (width !== undefined && height !== undefined && center) {
    // Draw filled rectangle
    drawRect({
      ctx,
      center,
      width,
      height,
      fill: soldermaskColor,
      realToCanvasMat,
    })
  }
}

function processSoldermaskForElement(
  ctx: CanvasContext,
  element: AnyCircuitElement,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
  layer: "top" | "bottom",
): void {
  if (element.type === "pcb_smtpad") {
    processSoldermaskForSmtPad(
      ctx,
      element as PcbSmtPad,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
    )
  } else if (element.type === "pcb_plated_hole") {
    processSoldermaskForPlatedHole(
      ctx,
      element as PcbPlatedHole,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
    )
  } else if (element.type === "pcb_hole") {
    processSoldermaskForHole(
      ctx,
      element as PcbHole,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
    )
  } else if (element.type === "pcb_via") {
    processSoldermaskForVia(ctx, element as PcbVia, realToCanvasMat, colorMap)
  } else if (element.type === "pcb_cutout") {
    processSoldermaskForCutout(
      ctx,
      element as PcbCutout,
      realToCanvasMat,
      colorMap,
    )
  }
}

function processSoldermaskForSmtPad(
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

  if (isCoveredWithSoldermask) {
    // Draw lighter green soldermask over the pad
    drawPadShape(
      ctx,
      pad,
      realToCanvasMat,
      soldermaskOverCopperColor,
      0,
      0,
      0,
      0,
    )
  } else if (margin < 0 || ml < 0 || mr < 0 || mt < 0 || mb < 0) {
    // Negative margin: cut out the pad shape, then cover edges with lighter green
    // First cut out the full pad
    cutoutPadShape(ctx, pad, realToCanvasMat, colorMap)
    // Then draw lighter green soldermask on the edges (negative margin amount)
    drawNegativeMarginSoldermask(
      ctx,
      pad,
      realToCanvasMat,
      soldermaskOverCopperColor,
      ml,
      mr,
      mt,
      mb,
    )
  } else {
    // Positive or zero margin: cut out the pad plus margin
    cutoutPadShape(ctx, pad, realToCanvasMat, colorMap, ml, mr, mt, mb)
  }
}

function cutoutPadShape(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  ml = 0,
  mr = 0,
  mt = 0,
  mb = 0,
): void {
  // For positive margins, draw substrate in the larger area, then copper in the pad area
  const copperColor =
    colorMap.copper[pad.layer as keyof typeof colorMap.copper] ||
    colorMap.copper.top
  if (ml > 0 || mr > 0 || mt > 0 || mb > 0) {
    // Draw the larger area (pad + margin) with substrate
    drawPadShape(ctx, pad, realToCanvasMat, colorMap.substrate, ml, mr, mt, mb)
    // Draw the pad area with copper on top
    drawPadShape(ctx, pad, realToCanvasMat, copperColor, 0, 0, 0, 0)
  } else {
    // For zero or negative margins, just draw copper in the pad area
    drawPadShape(ctx, pad, realToCanvasMat, copperColor, ml, mr, mt, mb)
  }
}

function drawPadShape(
  ctx: CanvasContext,
  pad: PcbSmtPad,
  realToCanvasMat: Matrix,
  fill: string,
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

    drawRect({
      ctx,
      center: { x: pad.x + dxGlobal, y: pad.y + dyGlobal },
      width: pad.width + ml + mr,
      height: pad.height + mt + mb,
      fill,
      realToCanvasMat,
      borderRadius,
      rotation,
    })
  } else if (pad.shape === "circle") {
    const margin = (ml + mr + mt + mb) / 4
    drawCircle({
      ctx,
      center: { x: pad.x, y: pad.y },
      radius: pad.radius + margin,
      fill,
      realToCanvasMat,
    })
  } else if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const margin = (ml + mr) / 2
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width + margin * 2,
      height: pad.height + margin * 2,
      fill,
      realToCanvasMat,
      rotation,
    })
  } else if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    const margin = (ml + mr + mt + mb) / 4
    const points =
      margin !== 0 ? offsetPolygonPoints(pad.points, margin) : pad.points
    drawPolygon({
      ctx,
      points,
      fill,
      realToCanvasMat,
    })
  }
}

function drawNegativeMarginSoldermask(
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

    ctx.fillStyle = soldermaskOverCopperColor
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
    ctx.fillStyle = soldermaskOverCopperColor
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

    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  }
}

function drawRoundedRectPath(
  ctx: CanvasContext,
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number,
): void {
  const x = cx - width / 2
  const y = cy - height / 2
  const r = Math.min(radius, width / 2, height / 2)

  if (r > 0) {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.arcTo(x + width, y, x + width, y + r, r)
    ctx.lineTo(x + width, y + height - r)
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
    ctx.lineTo(x + r, y + height)
    ctx.arcTo(x, y + height, x, y + height - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  } else {
    ctx.rect(x, y, width, height)
  }
  ctx.closePath()
}

function drawPillPath(
  ctx: CanvasContext,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
  if (width > height) {
    const radius = height / 2
    const straightLength = width - height
    ctx.moveTo(cx - straightLength / 2, cy - radius)
    ctx.lineTo(cx + straightLength / 2, cy - radius)
    ctx.arc(cx + straightLength / 2, cy, radius, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(cx - straightLength / 2, cy + radius)
    ctx.arc(cx - straightLength / 2, cy, radius, Math.PI / 2, -Math.PI / 2)
  } else if (height > width) {
    const radius = width / 2
    const straightLength = height - width
    ctx.moveTo(cx + radius, cy - straightLength / 2)
    ctx.lineTo(cx + radius, cy + straightLength / 2)
    ctx.arc(cx, cy + straightLength / 2, radius, 0, Math.PI)
    ctx.lineTo(cx - radius, cy - straightLength / 2)
    ctx.arc(cx, cy - straightLength / 2, radius, Math.PI, 0)
  } else {
    ctx.arc(cx, cy, width / 2, 0, Math.PI * 2)
  }
  ctx.closePath()
}

function processSoldermaskForPlatedHole(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
  layer: "top" | "bottom",
): void {
  // Check if this hole is on the current layer
  if (hole.layers && !hole.layers.includes(layer)) return

  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = hole.soldermask_margin ?? 0

  if (isCoveredWithSoldermask) {
    // Draw lighter green soldermask over the copper ring
    drawPlatedHoleShape(
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      0,
    )
  } else if (margin < 0) {
    // Negative margin: cut out the shape, then cover edges with lighter green
    cutoutPlatedHoleShape(ctx, hole, realToCanvasMat, colorMap, 0)
    drawNegativeMarginForPlatedHole(
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    )
  } else {
    // Positive or zero margin: cut out the shape plus margin
    cutoutPlatedHoleShape(ctx, hole, realToCanvasMat, colorMap, margin)
  }
}

function drawPlatedHoleShape(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  fill: string,
  margin: number,
): void {
  if (hole.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.outer_diameter / 2 + margin,
      fill,
      realToCanvasMat,
    })
  } else if (hole.shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.outer_width / 2 + margin,
      radius_y: hole.outer_height / 2 + margin,
      fill,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })
  } else if (hole.shape === "pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.outer_width + margin * 2,
      height: hole.outer_height + margin * 2,
      fill,
      realToCanvasMat,
      rotation: hole.ccw_rotation,
    })
  } else if (
    hole.shape === "circular_hole_with_rect_pad" ||
    hole.shape === "pill_hole_with_rect_pad"
  ) {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width + margin * 2,
      height: hole.rect_pad_height + margin * 2,
      fill,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius ?? 0,
    })
  } else if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width + margin * 2,
      height: hole.rect_pad_height + margin * 2,
      fill,
      realToCanvasMat,
      borderRadius: hole.rect_border_radius ?? 0,
      rotation: hole.rect_ccw_rotation,
    })
  } else if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    const padPoints = hole.pad_outline.map(
      (point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }),
    )
    const points =
      margin !== 0 ? offsetPolygonPoints(padPoints, margin) : padPoints
    drawPolygon({
      ctx,
      points,
      fill,
      realToCanvasMat,
    })
  }
}

function cutoutPlatedHoleShape(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  margin: number,
): void {
  // For positive margins, draw substrate in the larger area
  // The plated hole copper will be drawn on top later
  drawPlatedHoleShape(ctx, hole, realToCanvasMat, colorMap.substrate, margin)
}

function drawNegativeMarginForPlatedHole(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  soldermaskOverCopperColor: string,
  margin: number,
): void {
  const thickness = Math.abs(margin)

  if (hole.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledOuterRadius =
      (hole.outer_diameter / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadius = Math.max(0, scaledOuterRadius - scaledThickness)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, scaledOuterRadius, 0, Math.PI * 2)
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX = (hole.outer_width / 2) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY = (hole.outer_height / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadiusX = Math.max(0, scaledRadiusX - scaledThickness)
    const innerRadiusY = Math.max(0, scaledRadiusY - scaledThickness)

    ctx.save()
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.translate(cx, cy)
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    ctx.beginPath()
    ctx.ellipse(cx, cy, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      // For the inner ellipse, we need to draw it in reverse direction
      // Move to a point on the inner ellipse
      ctx.moveTo(cx + innerRadiusX, cy)
      // Draw the inner ellipse in reverse (clockwise) direction
      ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.shape === "pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.outer_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.outer_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.translate(cx, cy)
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    // Draw outer pill
    ctx.beginPath()
    drawPillPath(ctx, cx, cy, scaledWidth, scaledHeight)

    // Draw inner pill cutout
    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      drawPillPath(ctx, cx, cy, innerWidth, innerHeight)
    }

    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (
    hole.shape === "circular_hole_with_rect_pad" ||
    hole.shape === "pill_hole_with_rect_pad" ||
    hole.shape === "rotated_pill_hole_with_rect_pad"
  ) {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.rect_pad_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.rect_pad_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    if (
      hole.shape === "rotated_pill_hole_with_rect_pad" &&
      hole.rect_ccw_rotation
    ) {
      ctx.translate(cx, cy)
      ctx.rotate((-hole.rect_ccw_rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    // Draw outer rectangle
    ctx.beginPath()
    const outerRadius = hole.rect_border_radius
      ? hole.rect_border_radius * Math.abs(realToCanvasMat.a)
      : 0
    drawRoundedRectPath(ctx, cx, cy, scaledWidth, scaledHeight, outerRadius)

    // Draw inner rectangle cutout
    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      const innerRadius = Math.max(0, outerRadius - scaledThickness)
      drawRoundedRectPath(ctx, cx, cy, innerWidth, innerHeight, innerRadius)
    }

    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    // Transform pad_outline points to be relative to hole.x, hole.y
    const padPoints = hole.pad_outline.map(
      (point: { x: number; y: number }) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      }),
    )

    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    // For negative margins, outer is pad boundary, inner is contracted by margin
    ctx.save()
    ctx.beginPath()
    const canvasPoints = padPoints.map((p) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )

    const firstPoint = canvasPoints[0]
    if (firstPoint) {
      const [firstX, firstY] = firstPoint
      ctx.moveTo(firstX, firstY)

      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (point) {
          const [x, y] = point
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()

      // Draw inner polygon cutout (contracted by thickness)
      if (scaledThickness > 0) {
        const innerPoints = offsetPolygonPoints(
          padPoints,
          -scaledThickness / Math.abs(realToCanvasMat.a),
        )
        if (innerPoints.length >= 3) {
          const innerCanvasPoints = innerPoints.map((p) =>
            applyToPoint(realToCanvasMat, [p.x, p.y]),
          )

          const firstInnerPoint = innerCanvasPoints[0]
          if (firstInnerPoint) {
            const [firstX, firstY] = firstInnerPoint
            ctx.moveTo(firstX, firstY)

            for (let i = 1; i < innerCanvasPoints.length; i++) {
              const point = innerCanvasPoints[i]
              if (point) {
                const [x, y] = point
                ctx.lineTo(x, y)
              }
            }
            ctx.closePath()
          }
        }
      }

      ctx.fillStyle = soldermaskOverCopperColor
      ctx.fill("evenodd")
    }
    ctx.restore()
  }
}

function processSoldermaskForHole(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
): void {
  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = hole.soldermask_margin ?? 0

  if (isCoveredWithSoldermask) {
    // Draw lighter green soldermask over the hole
    drawHoleShape(ctx, hole, realToCanvasMat, soldermaskOverCopperColor, 0)
  } else if (margin < 0) {
    // Negative margin: cut out, then cover edges
    cutoutHoleShape(ctx, hole, realToCanvasMat, colorMap, 0)
    drawNegativeMarginForHole(
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    )
  } else {
    // Positive or zero margin: cut out with margin
    cutoutHoleShape(ctx, hole, realToCanvasMat, colorMap, margin)
  }
}

function getHoleRotation(hole: PcbHole): number {
  if ("ccw_rotation" in hole && typeof hole.ccw_rotation === "number") {
    return hole.ccw_rotation
  }
  return 0
}

function drawHoleShape(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  fill: string,
  margin: number,
): void {
  const rotation = getHoleRotation(hole)

  if (hole.hole_shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2 + margin,
      fill,
      realToCanvasMat,
    })
  } else if (hole.hole_shape === "square") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_diameter + margin * 2,
      height: hole.hole_diameter + margin * 2,
      fill,
      realToCanvasMat,
      rotation,
    })
  } else if (hole.hole_shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2 + margin,
      radius_y: hole.hole_height / 2 + margin,
      fill,
      realToCanvasMat,
      rotation,
    })
  } else if (hole.hole_shape === "rect") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width + margin * 2,
      height: hole.hole_height + margin * 2,
      fill,
      realToCanvasMat,
      rotation,
    })
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width + margin * 2,
      height: hole.hole_height + margin * 2,
      fill,
      realToCanvasMat,
      rotation,
    })
  }
}

function cutoutHoleShape(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  margin: number,
): void {
  // Use substrate color for cutout (reveals what's underneath the soldermask)
  drawHoleShape(ctx, hole, realToCanvasMat, colorMap.substrate, margin)
}

function drawNegativeMarginForHole(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  soldermaskOverCopperColor: string,
  margin: number,
): void {
  const thickness = Math.abs(margin)

  if (hole.hole_shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadius = (hole.hole_diameter / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadius = Math.max(0, scaledRadius - scaledThickness)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    if (innerRadius > 0) {
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2, true)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "square") {
    const rotation = getHoleRotation(hole)
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledSize = hole.hole_diameter * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerSize = Math.max(0, scaledSize - scaledThickness * 2)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize)
    if (innerSize > 0) {
      ctx.rect(-innerSize / 2, -innerSize / 2, innerSize, innerSize)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "oval") {
    const rotation = getHoleRotation(hole)
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX = (hole.hole_width / 2) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY = (hole.hole_height / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadiusX = Math.max(0, scaledRadiusX - scaledThickness)
    const innerRadiusY = Math.max(0, scaledRadiusY - scaledThickness)

    ctx.save()
    if (rotation !== 0) {
      ctx.translate(cx, cy)
      ctx.rotate((-rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    ctx.beginPath()
    ctx.ellipse(cx, cy, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      ctx.moveTo(cx + innerRadiusX, cy)
      ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "rect") {
    const rotation = getHoleRotation(hole)
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.hole_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.hole_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerWidth = Math.max(0, scaledWidth - scaledThickness * 2)
    const innerHeight = Math.max(0, scaledHeight - scaledThickness * 2)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    if (innerWidth > 0 && innerHeight > 0) {
      ctx.rect(-innerWidth / 2, -innerHeight / 2, innerWidth, innerHeight)
    }
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const rotation = getHoleRotation(hole)
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.hole_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.hole_height * Math.abs(realToCanvasMat.a)
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

    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")
    ctx.restore()
  }
}

function processSoldermaskForVia(
  ctx: CanvasContext,
  via: PcbVia,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
): void {
  // Vias typically have soldermask openings to expose the copper ring
  // Cut out the via shape to expose the copper underneath
  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.outer_diameter / 2,
    fill: colorMap.substrate,
    realToCanvasMat,
  })
}

function processSoldermaskForCutout(
  ctx: CanvasContext,
  cutout: PcbCutout,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
): void {
  // Cutouts go through the entire board, so they cut through soldermask too
  if (cutout.shape === "rect") {
    drawRect({
      ctx,
      center: cutout.center,
      width: cutout.width,
      height: cutout.height,
      fill: colorMap.drill,
      realToCanvasMat,
      rotation: cutout.rotation ?? 0,
      borderRadius: cutout.corner_radius ?? 0,
    })
  } else if (cutout.shape === "circle") {
    drawCircle({
      ctx,
      center: cutout.center,
      radius: cutout.radius,
      fill: colorMap.drill,
      realToCanvasMat,
    })
  } else if (
    cutout.shape === "polygon" &&
    cutout.points &&
    cutout.points.length >= 3
  ) {
    drawPolygon({
      ctx,
      points: cutout.points,
      fill: colorMap.drill,
      realToCanvasMat,
    })
  }
}
