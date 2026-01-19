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
}): void {
  const { ctx, cx, cy, width, height } = params
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
    ctx.moveTo(cx + radius, cy - straightLength / 2)
    ctx.lineTo(cx + radius, cy + straightLength / 2)
    ctx.arc(cx, cy + straightLength / 2, radius, 0, Math.PI)
    ctx.lineTo(cx - radius, cy - straightLength / 2)
    ctx.arc(cx, cy - straightLength / 2, radius, Math.PI, 0)
  } else {
    // Square dimensions = circle
    ctx.arc(cx, cy, width / 2, 0, Math.PI * 2)
  }
  ctx.closePath()
}
