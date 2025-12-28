import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawDimensionLine } from "../shapes/dimension-line"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  pcbFabricationNoteDimension: PcbFabricationNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_FABRICATION_NOTE_COLOR = "rgba(255,255,255,0.5)"

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, pcbFabricationNoteDimension, realToCanvasMat } = params

  const color =
    pcbFabricationNoteDimension.color ?? DEFAULT_FABRICATION_NOTE_COLOR

  drawDimensionLine({
    ctx,
    from: pcbFabricationNoteDimension.from,
    to: pcbFabricationNoteDimension.to,
    realToCanvasMat,
    color,
    fontSize: pcbFabricationNoteDimension.font_size ?? 1,
    arrowSize: pcbFabricationNoteDimension.arrow_size ?? 1,
    text: pcbFabricationNoteDimension.text,
    textRotation: pcbFabricationNoteDimension.text_ccw_rotation,
    offset:
      pcbFabricationNoteDimension.offset_distance &&
      pcbFabricationNoteDimension.offset_direction
        ? {
            distance: pcbFabricationNoteDimension.offset_distance,
            direction: pcbFabricationNoteDimension.offset_direction,
          }
        : undefined,
  })
}
