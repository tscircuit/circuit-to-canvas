import type { PcbVia } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"

/**
 * Process soldermask for a via.
 * Vias typically have soldermask openings to expose the copper ring.
 */
export function processViaSoldermask(params: {
  ctx: CanvasContext
  via: PcbVia
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}): void {
  const { ctx, via, realToCanvasMat, colorMap } = params
  // Vias typically have soldermask openings to expose the copper ring
  // Draw substrate color to simulate the cutout
  const [cx, cy] = applyToPoint(realToCanvasMat, [via.x, via.y])
  const scaledRadius = (via.outer_diameter / 2) * Math.abs(realToCanvasMat.a)

  ctx.fillStyle = colorMap.substrate
  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()
}
