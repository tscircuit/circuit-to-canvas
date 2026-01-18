import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCutout,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
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
 * Draws the soldermask layer for the PCB as a unified geometry.
 *
 * The soldermask is drawn as a single unified layer that covers the entire board.
 * Elements "cut through" the soldermask by drawing on top with appropriate colors:
 *
 * 1. Draw full soldermask covering the board (dark green)
 * 2. For each element that needs a soldermask opening:
 *    - If positive margin: draw substrate color for the larger area, then copper color for pad
 *    - If zero margin: draw copper color for the pad area
 *    - If negative margin: draw copper color for the pad, then light green ring for margin
 * 3. For elements with is_covered_with_soldermask: draw light green soldermask over them
 *
 * Note: This approach draws colors ON TOP of the soldermask rather than using
 * destination-out compositing. This is necessary because some elements (plated holes,
 * vias, non-plated holes) are drawn AFTER the soldermask layer, so cutting through
 * the soldermask wouldn't reveal anything useful underneath.
 */
export function drawPcbSoldermask(params: DrawPcbSoldermaskParams): void {
  const { ctx, board, elements, realToCanvasMat, colorMap, layer } = params

  const soldermaskColor = colorMap.soldermask[layer] ?? colorMap.soldermask.top
  const soldermaskOverCopperColor =
    colorMap.soldermaskOverCopper[layer] ?? colorMap.soldermaskOverCopper.top

  // Step 1: Draw the full soldermask covering the board
  drawBoardSoldermask(ctx, board, realToCanvasMat, soldermaskColor)

  // Step 2: Process each element - draw cutouts and light green areas as needed
  for (const element of elements) {
    processElementSoldermask(
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
    const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
    const scaledWidth = width * Math.abs(realToCanvasMat.a)
    const scaledHeight = height * Math.abs(realToCanvasMat.a)

    ctx.fillStyle = soldermaskColor
    ctx.fillRect(
      cx - scaledWidth / 2,
      cy - scaledHeight / 2,
      scaledWidth,
      scaledHeight,
    )
  }
}

/**
 * Process soldermask for an element by drawing on top of the soldermask layer.
 * This simulates cutouts by drawing substrate/copper colors over the soldermask.
 */
function processElementSoldermask(
  ctx: CanvasContext,
  element: AnyCircuitElement,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
  layer: "top" | "bottom",
): void {
  if (element.type === "pcb_smtpad") {
    processSmtPadSoldermask(
      ctx,
      element as PcbSmtPad,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
    )
  } else if (element.type === "pcb_plated_hole") {
    processPlatedHoleSoldermask(
      ctx,
      element as PcbPlatedHole,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
    )
  } else if (element.type === "pcb_hole") {
    processHoleSoldermask(
      ctx,
      element as PcbHole,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
    )
  } else if (element.type === "pcb_via") {
    processViaSoldermask(ctx, element as PcbVia, realToCanvasMat, colorMap)
  } else if (element.type === "pcb_cutout") {
    processCutoutSoldermask(
      ctx,
      element as PcbCutout,
      realToCanvasMat,
      colorMap,
    )
  }
}

// =============================================================================
// SMT PAD SOLDERMASK
// =============================================================================

function processSmtPadSoldermask(
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
    const canvasPoints = points.map((p) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )

    ctx.beginPath()
    const firstPoint = canvasPoints[0]
    if (firstPoint) {
      ctx.moveTo(firstPoint[0], firstPoint[1])
      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (point) {
          ctx.lineTo(point[0], point[1])
        }
      }
      ctx.closePath()
    }
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

// =============================================================================
// PLATED HOLE SOLDERMASK
// =============================================================================

function processPlatedHoleSoldermask(
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
  const copperColor = colorMap.copper.top

  if (isCoveredWithSoldermask) {
    // Draw light green over the entire hole copper ring
    ctx.fillStyle = soldermaskOverCopperColor
    drawPlatedHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  } else if (margin < 0) {
    // Negative margin: draw full copper, then light green ring
    ctx.fillStyle = copperColor
    drawPlatedHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
    drawNegativeMarginRingForPlatedHole(
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    )
  } else if (margin > 0) {
    // Positive margin: draw substrate for larger area, then copper for hole
    ctx.fillStyle = colorMap.substrate
    drawPlatedHoleShapePath(ctx, hole, realToCanvasMat, margin)
    ctx.fill()
    ctx.fillStyle = copperColor
    drawPlatedHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  } else {
    // Zero margin: just draw copper for the hole
    ctx.fillStyle = copperColor
    drawPlatedHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  }
}

function drawPlatedHoleShapePath(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  margin: number,
): void {
  if (hole.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadius =
      (hole.outer_diameter / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (hole.shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX =
      (hole.outer_width / 2 + margin) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY =
      (hole.outer_height / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    ctx.closePath()
    ctx.restore()
  } else if (hole.shape === "pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.outer_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.outer_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)
    ctx.restore()
  } else if (
    hole.shape === "circular_hole_with_rect_pad" ||
    hole.shape === "pill_hole_with_rect_pad"
  ) {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.rect_pad_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.rect_pad_height + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledRadius =
      (hole.rect_border_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    drawRoundedRectPath(ctx, cx, cy, scaledWidth, scaledHeight, scaledRadius)
  } else if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.rect_pad_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.rect_pad_height + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledRadius =
      (hole.rect_border_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (hole.rect_ccw_rotation) {
      ctx.rotate((-hole.rect_ccw_rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, scaledRadius)
    ctx.restore()
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
    const canvasPoints = points.map((p) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )

    ctx.beginPath()
    const firstPoint = canvasPoints[0]
    if (firstPoint) {
      ctx.moveTo(firstPoint[0], firstPoint[1])
      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (point) {
          ctx.lineTo(point[0], point[1])
        }
      }
      ctx.closePath()
    }
  }
}

function drawNegativeMarginRingForPlatedHole(
  ctx: CanvasContext,
  hole: PcbPlatedHole,
  realToCanvasMat: Matrix,
  soldermaskOverCopperColor: string,
  margin: number,
): void {
  const thickness = Math.abs(margin)

  ctx.fillStyle = soldermaskOverCopperColor

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
    ctx.translate(cx, cy)
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      ctx.moveTo(innerRadiusX, 0)
      ctx.ellipse(0, 0, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.shape === "pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.outer_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.outer_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (hole.ccw_rotation && hole.ccw_rotation !== 0) {
      ctx.rotate((-hole.ccw_rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)

    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      drawPillPath(ctx, 0, 0, innerWidth, innerHeight)
    }

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
    ctx.translate(cx, cy)
    if (
      hole.shape === "rotated_pill_hole_with_rect_pad" &&
      hole.rect_ccw_rotation
    ) {
      ctx.rotate((-hole.rect_ccw_rotation * Math.PI) / 180)
    }

    const outerRadius = hole.rect_border_radius
      ? hole.rect_border_radius * Math.abs(realToCanvasMat.a)
      : 0

    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, outerRadius)

    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      const innerRadius = Math.max(0, outerRadius - scaledThickness)
      drawRoundedRectPath(ctx, 0, 0, innerWidth, innerHeight, innerRadius)
    }

    ctx.fill("evenodd")
    ctx.restore()
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

    ctx.save()
    ctx.beginPath()

    // Draw outer polygon
    const canvasPoints = padPoints.map((p) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )
    const firstPoint = canvasPoints[0]
    if (firstPoint) {
      ctx.moveTo(firstPoint[0], firstPoint[1])
      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (point) {
          ctx.lineTo(point[0], point[1])
        }
      }
      ctx.closePath()

      // Draw inner polygon cutout
      const innerPoints = offsetPolygonPoints(padPoints, -thickness)
      if (innerPoints.length >= 3) {
        const innerCanvasPoints = innerPoints.map((p) =>
          applyToPoint(realToCanvasMat, [p.x, p.y]),
        )
        const firstInnerPoint = innerCanvasPoints[0]
        if (firstInnerPoint) {
          ctx.moveTo(firstInnerPoint[0], firstInnerPoint[1])
          for (let i = 1; i < innerCanvasPoints.length; i++) {
            const point = innerCanvasPoints[i]
            if (point) {
              ctx.lineTo(point[0], point[1])
            }
          }
          ctx.closePath()
        }
      }

      ctx.fill("evenodd")
    }
    ctx.restore()
  }
}

// =============================================================================
// HOLE (NON-PLATED) SOLDERMASK
// =============================================================================

function processHoleSoldermask(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
  soldermaskOverCopperColor: string,
): void {
  const isCoveredWithSoldermask = hole.is_covered_with_solder_mask === true
  const margin = hole.soldermask_margin ?? 0

  if (isCoveredWithSoldermask) {
    // Draw light green over the entire hole
    ctx.fillStyle = soldermaskOverCopperColor
    drawHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  } else if (margin < 0) {
    // Negative margin: draw drill color for hole, then light green ring
    ctx.fillStyle = colorMap.drill
    drawHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
    drawNegativeMarginRingForHole(
      ctx,
      hole,
      realToCanvasMat,
      soldermaskOverCopperColor,
      margin,
    )
  } else if (margin > 0) {
    // Positive margin: draw substrate for larger area, then drill for hole
    ctx.fillStyle = colorMap.substrate
    drawHoleShapePath(ctx, hole, realToCanvasMat, margin)
    ctx.fill()
    ctx.fillStyle = colorMap.drill
    drawHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  } else {
    // Zero margin: just draw drill color for the hole
    ctx.fillStyle = colorMap.drill
    drawHoleShapePath(ctx, hole, realToCanvasMat, 0)
    ctx.fill()
  }
}

function getHoleRotation(hole: PcbHole): number {
  if ("ccw_rotation" in hole && typeof hole.ccw_rotation === "number") {
    return hole.ccw_rotation
  }
  return 0
}

function drawHoleShapePath(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  margin: number,
): void {
  const rotation = getHoleRotation(hole)

  if (hole.hole_shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadius =
      (hole.hole_diameter / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (hole.hole_shape === "square") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledSize =
      (hole.hole_diameter + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX =
      (hole.hole_width / 2 + margin) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY =
      (hole.hole_height / 2 + margin) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.hole_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.hole_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.closePath()
    ctx.restore()
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth =
      (hole.hole_width + margin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (hole.hole_height + margin * 2) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)
    ctx.restore()
  }
}

function drawNegativeMarginRingForHole(
  ctx: CanvasContext,
  hole: PcbHole,
  realToCanvasMat: Matrix,
  soldermaskOverCopperColor: string,
  margin: number,
): void {
  const thickness = Math.abs(margin)
  const rotation = getHoleRotation(hole)

  ctx.fillStyle = soldermaskOverCopperColor

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
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "square") {
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
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "oval") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledRadiusX = (hole.hole_width / 2) * Math.abs(realToCanvasMat.a)
    const scaledRadiusY = (hole.hole_height / 2) * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)
    const innerRadiusX = Math.max(0, scaledRadiusX - scaledThickness)
    const innerRadiusY = Math.max(0, scaledRadiusY - scaledThickness)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
    if (innerRadiusX > 0 && innerRadiusY > 0) {
      ctx.moveTo(innerRadiusX, 0)
      ctx.ellipse(0, 0, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    }
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "rect") {
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
    ctx.fill("evenodd")
    ctx.restore()
  } else if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [hole.x, hole.y])
    const scaledWidth = hole.hole_width * Math.abs(realToCanvasMat.a)
    const scaledHeight = hole.hole_height * Math.abs(realToCanvasMat.a)
    const scaledThickness = thickness * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath(ctx, 0, 0, scaledWidth, scaledHeight)

    const innerWidth = scaledWidth - scaledThickness * 2
    const innerHeight = scaledHeight - scaledThickness * 2
    if (innerWidth > 0 && innerHeight > 0) {
      drawPillPath(ctx, 0, 0, innerWidth, innerHeight)
    }

    ctx.fill("evenodd")
    ctx.restore()
  }
}

// =============================================================================
// VIA SOLDERMASK
// =============================================================================

function processViaSoldermask(
  ctx: CanvasContext,
  via: PcbVia,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
): void {
  // Vias typically have soldermask openings to expose the copper ring
  // Draw substrate color to simulate the cutout
  const [cx, cy] = applyToPoint(realToCanvasMat, [via.x, via.y])
  const scaledRadius = (via.outer_diameter / 2) * Math.abs(realToCanvasMat.a)

  ctx.fillStyle = colorMap.substrate
  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
}

// =============================================================================
// CUTOUT (BOARD CUTOUT) SOLDERMASK
// =============================================================================

function processCutoutSoldermask(
  ctx: CanvasContext,
  cutout: PcbCutout,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
): void {
  // Cutouts go through the entire board, so they cut through soldermask too
  // Use drill color to indicate the cutout
  ctx.fillStyle = colorMap.drill

  if (cutout.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      cutout.center.x,
      cutout.center.y,
    ])
    const scaledWidth = cutout.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = cutout.height * Math.abs(realToCanvasMat.a)
    const scaledRadius =
      (cutout.corner_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (cutout.rotation) {
      ctx.rotate((-cutout.rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, scaledRadius)
    ctx.restore()
    ctx.fill()
  } else if (cutout.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      cutout.center.x,
      cutout.center.y,
    ])
    const scaledRadius = cutout.radius * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
  } else if (
    cutout.shape === "polygon" &&
    cutout.points &&
    cutout.points.length >= 3
  ) {
    const canvasPoints = cutout.points.map((p) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )

    ctx.beginPath()
    const firstPoint = canvasPoints[0]
    if (firstPoint) {
      ctx.moveTo(firstPoint[0], firstPoint[1])
      for (let i = 1; i < canvasPoints.length; i++) {
        const point = canvasPoints[i]
        if (point) {
          ctx.lineTo(point[0], point[1])
        }
      }
      ctx.closePath()
    }
    ctx.fill()
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
