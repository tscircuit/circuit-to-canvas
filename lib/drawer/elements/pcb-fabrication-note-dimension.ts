import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawDimensionCommon } from "./dimension-common"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  dimension: PcbFabricationNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

// Re-export the interface for convenience
export type { PcbFabricationNoteDimension }

const DEFAULT_FABRICATION_NOTE_COLOR = "rgba(255,255,255,0.5)"

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // For fabrication notes, we use a default color
  // Could be extended to support per-layer colors in the future
  return DEFAULT_FABRICATION_NOTE_COLOR
}

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, dimension, realToCanvasMat, colorMap } = params

  const defaultColor = layerToColor(dimension.layer, colorMap)
  const color = dimension.color ?? defaultColor

  drawDimensionCommon({
    ctx,
    dimension,
    realToCanvasMat,
    color,
  })
}
