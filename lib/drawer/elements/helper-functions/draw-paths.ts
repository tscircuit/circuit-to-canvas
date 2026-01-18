import type { CanvasContext } from "../../types"

/**
 * Draws a rounded rectangle path centered at (cx, cy).
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawRoundedRectPath(
  ctx: CanvasContext,
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number,
): void {
  const x = cx - width / 2
  const y = cy - height / 2
  const r = Math.min(radius, width / 2, height / 2)

  if (r > 0) {
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.arcTo(x + width, y, x + width, y + r, r)
    ctx.lineTo(x + width, y + height - r)
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
    ctx.lineTo(x + r, y + height)
    ctx.arcTo(x, y + height, x, y + height - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  } else {
    ctx.rect(x, y, width, height)
  }
  ctx.closePath()
}

/**
 * Draws a pill/stadium shape path centered at (cx, cy).
 * A pill is a rectangle with fully rounded ends (semicircular caps).
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPillPath(
  ctx: CanvasContext,
  cx: number,
  cy: number,
  width: number,
  height: number,
): void {
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

/**
 * Draws a polygon path from an array of points.
 * The path is not filled or stroked - call ctx.fill() or ctx.stroke() after.
 */
export function drawPolygonPath(
  ctx: CanvasContext,
  points: Array<{ x: number; y: number }>,
): void {
  if (points.length < 3) return

  const firstPoint = points[0]
  if (firstPoint) {
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (let i = 1; i < points.length; i++) {
      const point = points[i]
      if (point) {
        ctx.lineTo(point.x, point.y)
      }
    }
    ctx.closePath()
  }
}
