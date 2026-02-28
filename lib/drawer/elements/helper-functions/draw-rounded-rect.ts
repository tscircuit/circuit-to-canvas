import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { CanvasContext } from "../../types"

/**
 * Draws a rounded rectangle path centered at (cx, cy).
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawRoundedRectPath(params: {
  ctx: CanvasContext
  cx: number
  cy: number
  width: number
  height: number
  radius: number
  ccwRotationDegrees?: number
}): void {
  const {
    ctx,
    cx: centerX,
    cy: centerY,
    width,
    height,
    radius,
    ccwRotationDegrees = 0,
  } = params

  const rotationRadians = (-ccwRotationDegrees * Math.PI) / 180
  const transformMatrix = compose(
    translate(centerX, centerY),
    rotate(rotationRadians),
  )

  const halfWidth = width / 2
  const halfHeight = height / 2
  const rectCornerRadius = Math.min(radius, halfWidth, halfHeight)

  if (rectCornerRadius > 0) {
    const topLeftCornerVertex = applyToPoint(transformMatrix, {
      x: -halfWidth,
      y: -halfHeight,
    })
    const topRightCornerVertex = applyToPoint(transformMatrix, {
      x: halfWidth,
      y: -halfHeight,
    })
    const bottomRightCornerVertex = applyToPoint(transformMatrix, {
      x: halfWidth,
      y: halfHeight,
    })
    const bottomLeftCornerVertex = applyToPoint(transformMatrix, {
      x: -halfWidth,
      y: halfHeight,
    })

    // Start at a midpoint of the left vertical edge to ensure a smooth enclosed path drawing
    const leftEdgeMidpoint = applyToPoint(transformMatrix, {
      x: -halfWidth,
      y: 0,
    })
    ctx.moveTo(leftEdgeMidpoint.x, leftEdgeMidpoint.y)

    // Draw the rounded corners and straight edges
    ctx.arcTo(
      topLeftCornerVertex.x,
      topLeftCornerVertex.y,
      topRightCornerVertex.x,
      topRightCornerVertex.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      topRightCornerVertex.x,
      topRightCornerVertex.y,
      bottomRightCornerVertex.x,
      bottomRightCornerVertex.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      bottomRightCornerVertex.x,
      bottomRightCornerVertex.y,
      bottomLeftCornerVertex.x,
      bottomLeftCornerVertex.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      bottomLeftCornerVertex.x,
      bottomLeftCornerVertex.y,
      topLeftCornerVertex.x,
      topLeftCornerVertex.y,
      rectCornerRadius,
    )
  } else {
    const topLeftVertex = applyToPoint(transformMatrix, {
      x: -halfWidth,
      y: -halfHeight,
    })
    const topRightVertex = applyToPoint(transformMatrix, {
      x: halfWidth,
      y: -halfHeight,
    })
    const bottomRightVertex = applyToPoint(transformMatrix, {
      x: halfWidth,
      y: halfHeight,
    })
    const bottomLeftVertex = applyToPoint(transformMatrix, {
      x: -halfWidth,
      y: halfHeight,
    })

    ctx.moveTo(topLeftVertex.x, topLeftVertex.y)
    ctx.lineTo(topRightVertex.x, topRightVertex.y)
    ctx.lineTo(bottomRightVertex.x, bottomRightVertex.y)
    ctx.lineTo(bottomLeftVertex.x, bottomLeftVertex.y)
  }
  ctx.closePath()
}
