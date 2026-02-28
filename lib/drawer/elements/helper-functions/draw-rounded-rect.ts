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
  const { ctx, cx, cy, width, height, radius, ccwRotationDegrees = 0 } = params

  const rotationRad = (-ccwRotationDegrees * Math.PI) / 180
  const transformMatrix = compose(translate(cx, cy), rotate(rotationRad))

  const halfWidth = width / 2
  const halfHeight = height / 2
  const roundedRadius = Math.min(radius, halfWidth, halfHeight)

  if (roundedRadius > 0) {
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

    // Start at midpoint of left edge to draw smoothly around
    const startPoint = applyToPoint(transformMatrix, { x: -halfWidth, y: 0 })
    ctx.moveTo(startPoint.x, startPoint.y)
    ctx.arcTo(
      topLeftVertex.x,
      topLeftVertex.y,
      topRightVertex.x,
      topRightVertex.y,
      roundedRadius,
    )
    ctx.arcTo(
      topRightVertex.x,
      topRightVertex.y,
      bottomRightVertex.x,
      bottomRightVertex.y,
      roundedRadius,
    )
    ctx.arcTo(
      bottomRightVertex.x,
      bottomRightVertex.y,
      bottomLeftVertex.x,
      bottomLeftVertex.y,
      roundedRadius,
    )
    ctx.arcTo(
      bottomLeftVertex.x,
      bottomLeftVertex.y,
      topLeftVertex.x,
      topLeftVertex.y,
      roundedRadius,
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
