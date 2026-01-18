import type { PcbPlatedHole } from "circuit-json"
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
 * Process soldermask for a plated hole.
 */
export function processPlatedHoleSoldermask(
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
    if ((hole as any).ccw_rotation && (hole as any).ccw_rotation !== 0) {
      ctx.rotate((-(hole as any).ccw_rotation * Math.PI) / 180)
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
    if ((hole as any).ccw_rotation && (hole as any).ccw_rotation !== 0) {
      ctx.rotate((-(hole as any).ccw_rotation * Math.PI) / 180)
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
    const canvasPoints = points.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath(ctx, canvasPoints)
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
    if ((hole as any).ccw_rotation && (hole as any).ccw_rotation !== 0) {
      ctx.rotate((-(hole as any).ccw_rotation * Math.PI) / 180)
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
    if ((hole as any).ccw_rotation && (hole as any).ccw_rotation !== 0) {
      ctx.rotate((-(hole as any).ccw_rotation * Math.PI) / 180)
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
    const canvasPoints = padPoints.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })
    drawPolygonPath(ctx, canvasPoints)

    // Draw inner polygon cutout
    const innerPoints = offsetPolygonPoints(padPoints, -thickness)
    if (innerPoints.length >= 3) {
      const innerCanvasPoints = innerPoints.map((p) => {
        const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
        return { x, y }
      })
      drawPolygonPath(ctx, innerCanvasPoints)
    }

    ctx.fill("evenodd")
    ctx.restore()
  }
}
