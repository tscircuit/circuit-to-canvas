import type { PcbFabricationNotePath } from "circuit-json"
import { applyToPoint, type Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"

export interface DrawPcbFabricationNotePathParams {
  ctx: CanvasContext
  path: PcbFabricationNotePath
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbFabricationNotePath(
  params: DrawPcbFabricationNotePathParams,
): void {
  const { ctx, path, realToCanvasMat, colorMap } = params

  if (!path.route || path.route.length < 2) return

  const points = path.route.map((p) => applyToPoint(realToCanvasMat, p))
  const radius = (path.stroke_width * Math.abs(realToCanvasMat.a)) / 2
  ctx.beginPath()
  if (path.is_filled) {
    // All subpaths must have the same winding so nonzero filling unions them,
    // including when the board-to-canvas transform reverses orientation.
    const area = points.reduce((sum, p, i) => {
      const next = points[(i + 1) % points.length]!
      return sum + p.x * next.y - next.x * p.y
    }, 0)
    const ring = area < 0 ? [...points].reverse() : points
    ctx.moveTo(ring[0]!.x, ring[0]!.y)
    for (const p of ring.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.closePath()
  }
  if (path.has_stroke !== false && radius > 0) {
    const route = path.is_filled ? [...points, points[0]!] : points
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]!
      const b = route[i]!
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      ctx.moveTo(
        a.x + radius * Math.cos(angle + Math.PI / 2),
        a.y + radius * Math.sin(angle + Math.PI / 2),
      )
      ctx.arc(a.x, a.y, radius, angle + Math.PI / 2, angle + (3 * Math.PI) / 2)
      ctx.lineTo(
        b.x + radius * Math.cos(angle - Math.PI / 2),
        b.y + radius * Math.sin(angle - Math.PI / 2),
      )
      ctx.arc(b.x, b.y, radius, angle - Math.PI / 2, angle + Math.PI / 2)
      ctx.closePath()
    }
  }
  // Paint coverage once: joins, retraced strokes and fill/stroke intersections
  // must not accumulate the fabrication note's transparency.
  ctx.fillStyle = path.color ?? colorMap.fabricationNote
  ctx.fill()
}
