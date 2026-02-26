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
  rotation?: number // CCW degrees
}): void {
  const { ctx, cx, cy, width, height, radius, rotation = 0 } = params
  const mat = compose(translate(cx, cy), rotate(-(rotation * Math.PI) / 180))
  const p = (dx: number, dy: number) => applyToPoint(mat, { x: dx, y: dy })

  const x = -width / 2
  const y = -height / 2
  const r = Math.min(radius, width / 2, height / 2)

  if (r > 0) {
    const p1 = p(x + r, y)
    ctx.moveTo(p1.x, p1.y)
    const p2 = p(x + width - r, y)
    ctx.lineTo(p2.x, p2.y)
    const c1 = p(x + width, y)
    const c2 = p(x + width, y + r)
    ctx.arcTo(c1.x, c1.y, c2.x, c2.y, r)
    const p3 = p(x + width, y + height - r)
    ctx.lineTo(p3.x, p3.y)
    const c3 = p(x + width, y + height)
    const c4 = p(x + width - r, y + height)
    ctx.arcTo(c3.x, c3.y, c4.x, c4.y, r)
    const p4 = p(x + r, y + height)
    ctx.lineTo(p4.x, p4.y)
    const c5 = p(x, y + height)
    const c6 = p(x, y + height - r)
    ctx.arcTo(c5.x, c5.y, c6.x, c6.y, r)
    const p5 = p(x, y + r)
    ctx.lineTo(p5.x, p5.y)
    const c7 = p(x, y)
    const c8 = p(x + r, y)
    ctx.arcTo(c7.x, c7.y, c8.x, c8.y, r)
  } else {
    const p1 = p(x, y)
    ctx.moveTo(p1.x, p1.y)
    const p2 = p(x + width, y)
    ctx.lineTo(p2.x, p2.y)
    const p3 = p(x + width, y + height)
    ctx.lineTo(p3.x, p3.y)
    const p4 = p(x, y + height)
    ctx.lineTo(p4.x, p4.y)
  }
  ctx.closePath()
}
