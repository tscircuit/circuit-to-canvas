import type { Matrix } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { applyToPoint } from "transformation-matrix"

/**
 * Draws a soldermask ring for rectangular shapes with negative margin
 * (soldermask appears inside the pad boundary)
 */
export function drawSoldermaskRingForRect(
  ctx: CanvasContext,
  center: { x: number; y: number },
  width: number,
  height: number,
  margin: number,
  borderRadius: number,
  rotation: number,
  realToCanvasMat: Matrix,
  soldermaskColor: string,
  padColor: string,
): void {
  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledMargin = Math.abs(margin) * Math.abs(realToCanvasMat.a)
  const scaledRadius = borderRadius * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  // For negative margins, outer is pad boundary, inner is reduced by margin
  // Use source-atop so the ring only appears on the pad
  const prevCompositeOp = ctx.globalCompositeOperation
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = "source-atop"
  }

  // Draw outer rectangle filled (at pad boundary)
  const outerWidth = scaledWidth
  const outerHeight = scaledHeight
  const outerRadius = scaledRadius

  ctx.beginPath()
  if (outerRadius > 0) {
    const x = -outerWidth / 2
    const y = -outerHeight / 2
    const r = Math.min(outerRadius, outerWidth / 2, outerHeight / 2)

    ctx.moveTo(x + r, y)
    ctx.lineTo(x + outerWidth - r, y)
    ctx.arcTo(x + outerWidth, y, x + outerWidth, y + r, r)
    ctx.lineTo(x + outerWidth, y + outerHeight - r)
    ctx.arcTo(
      x + outerWidth,
      y + outerHeight,
      x + outerWidth - r,
      y + outerHeight,
      r,
    )
    ctx.lineTo(x + r, y + outerHeight)
    ctx.arcTo(x, y + outerHeight, x, y + outerHeight - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  } else {
    ctx.rect(-outerWidth / 2, -outerHeight / 2, outerWidth, outerHeight)
  }

  ctx.fillStyle = soldermaskColor
  ctx.fill()

  // Reset composite operation and restore pad color in inner area
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = prevCompositeOp || "source-over"
  }

  // Restore pad color in inner rectangle (reduced by margin)
  const innerWidth = scaledWidth - scaledMargin * 2
  const innerHeight = scaledHeight - scaledMargin * 2
  const innerRadius = Math.max(0, scaledRadius - scaledMargin)

  if (innerWidth > 0 && innerHeight > 0) {
    ctx.beginPath()
    if (innerRadius > 0) {
      const x = -innerWidth / 2
      const y = -innerHeight / 2
      const r = Math.min(innerRadius, innerWidth / 2, innerHeight / 2)

      ctx.moveTo(x + r, y)
      ctx.lineTo(x + innerWidth - r, y)
      ctx.arcTo(x + innerWidth, y, x + innerWidth, y + r, r)
      ctx.lineTo(x + innerWidth, y + innerHeight - r)
      ctx.arcTo(
        x + innerWidth,
        y + innerHeight,
        x + innerWidth - r,
        y + innerHeight,
        r,
      )
      ctx.lineTo(x + r, y + innerHeight)
      ctx.arcTo(x, y + innerHeight, x, y + innerHeight - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
    } else {
      ctx.rect(-innerWidth / 2, -innerHeight / 2, innerWidth, innerHeight)
    }

    ctx.fillStyle = padColor
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draws a soldermask ring for circular shapes with negative margin
 * (soldermask appears inside the pad boundary)
 */
export function drawSoldermaskRingForCircle(
  ctx: CanvasContext,
  center: { x: number; y: number },
  radius: number,
  margin: number,
  realToCanvasMat: Matrix,
  soldermaskColor: string,
  padColor: string,
): void {
  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledRadius = radius * Math.abs(realToCanvasMat.a)
  const scaledMargin = Math.abs(margin) * Math.abs(realToCanvasMat.a)

  ctx.save()

  // For negative margins, outer is pad boundary, inner is reduced by margin
  // Use source-atop so the ring only appears on the pad
  const prevCompositeOp = ctx.globalCompositeOperation
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = "source-atop"
  }

  // Draw outer circle filled (at pad boundary)
  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.fillStyle = soldermaskColor
  ctx.fill()

  // Reset composite operation and restore pad color in inner area
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = prevCompositeOp || "source-over"
  }

  // Restore pad color in inner circle (reduced by margin)
  const innerRadius = Math.max(0, scaledRadius - scaledMargin)
  if (innerRadius > 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
    ctx.fillStyle = padColor
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draws a soldermask ring for pill shapes with negative margin
 * (soldermask appears inside the pad boundary)
 */
export function drawSoldermaskRingForPill(
  ctx: CanvasContext,
  center: { x: number; y: number },
  width: number,
  height: number,
  margin: number,
  rotation: number,
  realToCanvasMat: Matrix,
  soldermaskColor: string,
  padColor: string,
): void {
  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledWidth = width * Math.abs(realToCanvasMat.a)
  const scaledHeight = height * Math.abs(realToCanvasMat.a)
  const scaledMargin = Math.abs(margin) * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  // For negative margins, outer is pad boundary, inner is reduced by margin
  // Use source-atop so the ring only appears on the pad
  const prevCompositeOp = ctx.globalCompositeOperation
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = "source-atop"
  }

  // Draw outer pill filled (at pad boundary)
  const outerWidth = scaledWidth
  const outerHeight = scaledHeight

  ctx.beginPath()

  if (outerWidth > outerHeight) {
    const radius = outerHeight / 2
    const straightLength = outerWidth - outerHeight
    ctx.moveTo(-straightLength / 2, -radius)
    ctx.lineTo(straightLength / 2, -radius)
    ctx.arc(straightLength / 2, 0, radius, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(-straightLength / 2, radius)
    ctx.arc(-straightLength / 2, 0, radius, Math.PI / 2, -Math.PI / 2)
  } else if (outerHeight > outerWidth) {
    const radius = outerWidth / 2
    const straightLength = outerHeight - outerWidth
    ctx.moveTo(radius, -straightLength / 2)
    ctx.lineTo(radius, straightLength / 2)
    ctx.arc(0, straightLength / 2, radius, 0, Math.PI)
    ctx.lineTo(-radius, -straightLength / 2)
    ctx.arc(0, -straightLength / 2, radius, Math.PI, 0)
  } else {
    ctx.arc(0, 0, outerWidth / 2, 0, Math.PI * 2)
  }

  ctx.fillStyle = soldermaskColor
  ctx.fill()

  // Reset composite operation and restore pad color in inner area
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = prevCompositeOp || "source-over"
  }

  // Restore pad color in inner pill (reduced by margin)
  const innerWidth = scaledWidth - scaledMargin * 2
  const innerHeight = scaledHeight - scaledMargin * 2

  if (innerWidth > 0 && innerHeight > 0) {
    ctx.beginPath()

    if (innerWidth > innerHeight) {
      const radius = innerHeight / 2
      const straightLength = innerWidth - innerHeight
      ctx.moveTo(-straightLength / 2, -radius)
      ctx.lineTo(straightLength / 2, -radius)
      ctx.arc(straightLength / 2, 0, radius, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(-straightLength / 2, radius)
      ctx.arc(-straightLength / 2, 0, radius, Math.PI / 2, -Math.PI / 2)
    } else if (innerHeight > innerWidth) {
      const radius = innerWidth / 2
      const straightLength = innerHeight - innerWidth
      ctx.moveTo(radius, -straightLength / 2)
      ctx.lineTo(radius, straightLength / 2)
      ctx.arc(0, straightLength / 2, radius, 0, Math.PI)
      ctx.lineTo(-radius, -straightLength / 2)
      ctx.arc(0, -straightLength / 2, radius, Math.PI, 0)
    } else {
      ctx.arc(0, 0, innerWidth / 2, 0, Math.PI * 2)
    }

    ctx.fillStyle = padColor
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draws a soldermask ring for oval shapes with negative margin
 * (soldermask appears inside the hole boundary)
 */
export function drawSoldermaskRingForOval(
  ctx: CanvasContext,
  center: { x: number; y: number },
  radius_x: number,
  radius_y: number,
  margin: number,
  rotation: number,
  realToCanvasMat: Matrix,
  soldermaskColor: string,
  holeColor: string,
): void {
  const [cx, cy] = applyToPoint(realToCanvasMat, [center.x, center.y])
  const scaledRadiusX = radius_x * Math.abs(realToCanvasMat.a)
  const scaledRadiusY = radius_y * Math.abs(realToCanvasMat.a)
  const scaledMargin = Math.abs(margin) * Math.abs(realToCanvasMat.a)

  ctx.save()
  ctx.translate(cx, cy)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  // For negative margins, outer is hole boundary, inner is reduced by margin
  // Use source-atop so the ring only appears on the hole
  const prevCompositeOp = ctx.globalCompositeOperation
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = "source-atop"
  }

  // Draw outer oval filled (at hole boundary)
  ctx.beginPath()
  ctx.ellipse(0, 0, scaledRadiusX, scaledRadiusY, 0, 0, Math.PI * 2)
  ctx.fillStyle = soldermaskColor
  ctx.fill()

  // Reset composite operation and restore hole color in inner area
  if (ctx.globalCompositeOperation !== undefined) {
    ctx.globalCompositeOperation = prevCompositeOp || "source-over"
  }

  // Restore hole color in inner oval (reduced by margin)
  // For ovals, we reduce both radii by the margin
  const innerRadiusX = Math.max(0, scaledRadiusX - scaledMargin)
  const innerRadiusY = Math.max(0, scaledRadiusY - scaledMargin)

  if (innerRadiusX > 0 && innerRadiusY > 0) {
    ctx.beginPath()
    ctx.ellipse(0, 0, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2)
    ctx.fillStyle = holeColor
    ctx.fill()
  }

  ctx.restore()
}
