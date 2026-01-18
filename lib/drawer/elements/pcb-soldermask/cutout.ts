import type { PcbCutout } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"
import {
  drawPolygonPath,
  drawRoundedRectPath,
} from "../helper-functions/draw-paths"

/**
 * Process soldermask for a board cutout.
 * Cutouts go through the entire board, so they cut through soldermask too.
 */
export function processCutoutSoldermask(
  ctx: CanvasContext,
  cutout: PcbCutout,
  realToCanvasMat: Matrix,
  colorMap: PcbColorMap,
): void {
  // Cutouts go through the entire board, so they cut through soldermask too
  // Use drill color to indicate the cutout
  ctx.fillStyle = colorMap.drill

  if (cutout.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      (cutout as any).center?.x ?? 0,
      (cutout as any).center?.y ?? 0,
    ])
    const scaledWidth = cutout.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = cutout.height * Math.abs(realToCanvasMat.a)
    const scaledRadius =
      (cutout.corner_radius ?? 0) * Math.abs(realToCanvasMat.a)

    ctx.save()
    ctx.translate(cx, cy)
    if (cutout.rotation) {
      ctx.rotate((-cutout.rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath(ctx, 0, 0, scaledWidth, scaledHeight, scaledRadius)
    ctx.restore()
    ctx.fill()
  } else if (cutout.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      (cutout as any).center?.x ?? 0,
      (cutout as any).center?.y ?? 0,
    ])
    const scaledRadius = cutout.radius * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
  } else if (
    cutout.shape === "polygon" &&
    cutout.points &&
    cutout.points.length >= 3
  ) {
    const canvasPoints = cutout.points.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath(ctx, canvasPoints)
    ctx.fill()
  }
}
