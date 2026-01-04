import type { PCBKeepout } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"

export interface DrawPcbKeepoutParams {
  ctx: CanvasContext
  keepout: PCBKeepout
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbKeepout(params: DrawPcbKeepoutParams): void {
  const { ctx, keepout, realToCanvasMat, colorMap } = params

  // Keepout zones are shown with a dashed border only (no fill)
  const strokeColor = colorMap.keepout
  const strokeWidth = 0.3 // Thicker stroke for better visibility

  if (keepout.shape === "rect") {
    // Draw rectangle with dashed border only (no fill)
    drawRect({
      ctx,
      center: keepout.center,
      width: keepout.width,
      height: keepout.height,
      fill: undefined,
      stroke: strokeColor,
      strokeWidth,
      realToCanvasMat,
      rotation: (keepout as { rotation?: number }).rotation ?? 0,
      isStrokeDashed: true,
    })
    return
  }

  if (keepout.shape === "circle") {
    // Draw circle with dashed border only (no fill)
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      keepout.center.x,
      keepout.center.y,
    ])
    const scaledRadius = keepout.radius * Math.abs(realToCanvasMat.a)
    const scaledStrokeWidth = strokeWidth * Math.abs(realToCanvasMat.a)

    ctx.save()

    // Set up dashed line pattern (dash and gap should be visible)
    ctx.setLineDash([scaledStrokeWidth * 3, scaledStrokeWidth * 2])

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = scaledStrokeWidth
    ctx.stroke()

    ctx.restore()
    return
  }
}
