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

  const rectHalfWidth = width / 2
  const rectHalfHeight = height / 2
  const rectCornerRadius = Math.min(radius, rectHalfWidth, rectHalfHeight)

  if (rectCornerRadius > 0) {
    const rectTopLeftCorner = applyToPoint(transformMatrix, {
      x: -rectHalfWidth,
      y: -rectHalfHeight,
    })
    const rectTopRightCorner = applyToPoint(transformMatrix, {
      x: rectHalfWidth,
      y: -rectHalfHeight,
    })
    const rectBottomRightCorner = applyToPoint(transformMatrix, {
      x: rectHalfWidth,
      y: rectHalfHeight,
    })
    const rectBottomLeftCorner = applyToPoint(transformMatrix, {
      x: -rectHalfWidth,
      y: rectHalfHeight,
    })

    // Start at a midpoint of the left vertical edge to ensure a smooth enclosed path drawing
    const leftEdgeMidpoint = applyToPoint(transformMatrix, {
      x: -rectHalfWidth,
      y: 0,
    })
    ctx.moveTo(leftEdgeMidpoint.x, leftEdgeMidpoint.y)

    // Draw the rounded corners and straight edges
    ctx.arcTo(
      rectTopLeftCorner.x,
      rectTopLeftCorner.y,
      rectTopRightCorner.x,
      rectTopRightCorner.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      rectTopRightCorner.x,
      rectTopRightCorner.y,
      rectBottomRightCorner.x,
      rectBottomRightCorner.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      rectBottomRightCorner.x,
      rectBottomRightCorner.y,
      rectBottomLeftCorner.x,
      rectBottomLeftCorner.y,
      rectCornerRadius,
    )
    ctx.arcTo(
      rectBottomLeftCorner.x,
      rectBottomLeftCorner.y,
      rectTopLeftCorner.x,
      rectTopLeftCorner.y,
      rectCornerRadius,
    )
  } else {
    const rectTopLeftCorner = applyToPoint(transformMatrix, {
      x: -rectHalfWidth,
      y: -rectHalfHeight,
    })
    const rectTopRightCorner = applyToPoint(transformMatrix, {
      x: rectHalfWidth,
      y: -rectHalfHeight,
    })
    const rectBottomRightCorner = applyToPoint(transformMatrix, {
      x: rectHalfWidth,
      y: rectHalfHeight,
    })
    const rectBottomLeftCorner = applyToPoint(transformMatrix, {
      x: -rectHalfWidth,
      y: rectHalfHeight,
    })

    ctx.moveTo(rectTopLeftCorner.x, rectTopLeftCorner.y)
    ctx.lineTo(rectTopRightCorner.x, rectTopRightCorner.y)
    ctx.lineTo(rectBottomRightCorner.x, rectBottomRightCorner.y)
    ctx.lineTo(rectBottomLeftCorner.x, rectBottomLeftCorner.y)
  }
  ctx.closePath()
}
