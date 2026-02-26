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
  rotation?: number // CCW degrees
}): void {
  const { ctx, cx, cy, width, height, rotation = 0 } = params
  const rad = -(rotation * Math.PI) / 180
  const mat = compose(translate(cx, cy), rotate(rad))
  const p = (dx: number, dy: number) => applyToPoint(mat, { x: dx, y: dy })

  if (width > height) {
    // Horizontal pill
    const radius = height / 2
    const straightLength = width - height
    ctx.moveTo(cx - straightLength / 2, cy - radius)
    ctx.lineTo(cx + straightLength / 2, cy - radius)
    ctx.arc(cx + straightLength / 2, cy, radius, -Math.PI / 2, Math.PI / 2)
    ctx.lineTo(cx - straightLength / 2, cy + radius)
    ctx.arc(cx - straightLength / 2, cy, radius, Math.PI / 2, -Math.PI / 2)
  } else if (height > width) {
    // Vertical pill
    const radius = width / 2
    const straightLength = height - width

    const p1 = p(radius, -straightLength / 2)
    ctx.moveTo(p1.x, p1.y)
    const p2 = p(radius, straightLength / 2)
    ctx.lineTo(p2.x, p2.y)

    const c1 = p(0, straightLength / 2)
    ctx.arc(c1.x, c1.y, radius, 0 + rad, Math.PI + rad)

    const p3 = p(-radius, -straightLength / 2)
    ctx.lineTo(p3.x, p3.y)

    const c2 = p(0, -straightLength / 2)
    ctx.arc(c2.x, c2.y, radius, Math.PI + rad, 0 + rad)
  } else {
    // Square dimensions = circle
    ctx.arc(cx, cy, width / 2, 0, Math.PI * 2)
  }
  ctx.closePath()
}
