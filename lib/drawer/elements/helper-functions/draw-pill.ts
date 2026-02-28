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
  const { ctx, cx, cy, width, height, ccwRotationDegrees = 0 } = params

  const rotationRad = (-ccwRotationDegrees * Math.PI) / 180
  const transformMatrix = compose(translate(cx, cy), rotate(rotationRad))

  if (width > height) {
    // Horizontal pill
    const radius = height / 2
    const halfStraightLength = (width - height) / 2
    const capCenter1 = applyToPoint(transformMatrix, {
      x: -halfStraightLength,
      y: 0,
    })
    const capCenter2 = applyToPoint(transformMatrix, {
      x: halfStraightLength,
      y: 0,
    })

    ctx.arc(
      capCenter2.x,
      capCenter2.y,
      radius,
      rotationRad - Math.PI / 2,
      rotationRad + Math.PI / 2,
    )
    ctx.arc(
      capCenter1.x,
      capCenter1.y,
      radius,
      rotationRad + Math.PI / 2,
      rotationRad - Math.PI / 2,
    )
  } else if (height > width) {
    // Vertical pill
    const radius = width / 2
    const halfStraightLength = (height - width) / 2
    const capCenter1 = applyToPoint(transformMatrix, {
      x: 0,
      y: -halfStraightLength,
    })
    const capCenter2 = applyToPoint(transformMatrix, {
      x: 0,
      y: halfStraightLength,
    })

    ctx.arc(
      capCenter2.x,
      capCenter2.y,
      radius,
      rotationRad,
      rotationRad + Math.PI,
    )
    ctx.arc(
      capCenter1.x,
      capCenter1.y,
      radius,
      rotationRad + Math.PI,
      rotationRad,
    )
  } else {
    // Circle
    ctx.arc(cx, cy, width / 2, 0, Math.PI * 2)
  }
  ctx.closePath()
}
