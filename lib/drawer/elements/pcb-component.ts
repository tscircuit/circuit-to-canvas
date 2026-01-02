import type { PcbComponent } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"

export interface DrawPcbComponentParams {
  ctx: CanvasContext
  component: PcbComponent
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

/**
 * Draws a component bounding box visualization.
 * This is a debug/development feature to visualize component placement boundaries.
 * Only renders when debugComponent colors are provided via colorOverrides.
 */
export function drawPcbComponent(params: DrawPcbComponentParams): void {
  const { ctx, component, realToCanvasMat, colorMap } = params

  // Only draw if debugComponent colors are provided
  if (!colorMap.debugComponent) {
    return
  }

  const { fill, stroke } = colorMap.debugComponent
  const strokeWidth = 0.1

  // Draw the bounding box as a solid rectangle outline with optional fill
  drawRect({
    ctx,
    center: component.center,
    width: component.width,
    height: component.height,
    fill: fill || undefined,
    stroke: stroke || undefined,
    strokeWidth: stroke ? strokeWidth : undefined,
    realToCanvasMat,
    rotation: component.rotation ?? 0,
    isStrokeDashed: false,
  })
}
