import { applyToPoint, compose, rotate, translate } from "transformation-matrix"
import type { CanvasContext } from "../../types"

/**
 * Draws a pill/stadium shape path centered at (cx, cy).
 * A pill is a rectangle with fully rounded ends (semicircular caps).
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPillPath(params: {
  ctx: CanvasContext
  cx: number
  cy: number
  width: number
  height: number
  ccwRotationDegrees?: number
}): void {
  const {
    ctx,
    cx: centerX,
    cy: centerY,
    width,
    height,
    ccwRotationDegrees = 0,
  } = params

  const rotationRadians = (-ccwRotationDegrees * Math.PI) / 180
  const transformMatrix = compose(
    translate(centerX, centerY),
    rotate(rotationRadians),
  )

  if (width > height) {
    // Horizontal pill: rectangle with semicircular caps on left and right
    const semicircleRadius = height / 2
    const semicircleCenterOffset = (width - height) / 2
    const leftSemicircleCenter = applyToPoint(transformMatrix, {
      x: -semicircleCenterOffset,
      y: 0,
    })
    const rightSemicircleCenter = applyToPoint(transformMatrix, {
      x: semicircleCenterOffset,
      y: 0,
    })

    ctx.arc(
      rightSemicircleCenter.x,
      rightSemicircleCenter.y,
      semicircleRadius,
      rotationRadians - Math.PI / 2,
      rotationRadians + Math.PI / 2,
    )
    ctx.arc(
      leftSemicircleCenter.x,
      leftSemicircleCenter.y,
      semicircleRadius,
      rotationRadians + Math.PI / 2,
      rotationRadians - Math.PI / 2,
    )
  } else if (height > width) {
    // Vertical pill: rectangle with semicircular caps on top and bottom
    const semicircleRadius = width / 2
    const semicircleCenterOffset = (height - width) / 2
    const topSemicircleCenter = applyToPoint(transformMatrix, {
      x: 0,
      y: -semicircleCenterOffset,
    })
    const bottomSemicircleCenter = applyToPoint(transformMatrix, {
      x: 0,
      y: semicircleCenterOffset,
    })

    // Start at a midpoint of the left vertical edge to ensure a smooth enclosed path drawing
    ctx.moveTo(
      bottomSemicircleCenter.x + semicircleRadius * Math.cos(rotationRadians),
      bottomSemicircleCenter.y + semicircleRadius * Math.sin(rotationRadians),
    )
    ctx.arc(
      bottomSemicircleCenter.x,
      bottomSemicircleCenter.y,
      semicircleRadius,
      rotationRadians,
      rotationRadians + Math.PI,
    )
    ctx.arc(
      topSemicircleCenter.x,
      topSemicircleCenter.y,
      semicircleRadius,
      rotationRadians + Math.PI,
      rotationRadians,
    )
  } else {
    // Circle: fallback when width equals height
    ctx.arc(centerX, centerY, width / 2, 0, Math.PI * 2)
  }
  ctx.closePath()
}
