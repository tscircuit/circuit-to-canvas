import type { PcbNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawDimensionCommon } from "./dimension-common"

export interface DrawPcbNoteDimensionParams {
  ctx: CanvasContext
  pcbNoteDimension: PcbNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_NOTE_COLOR = "rgba(255,255,255,0.5)"

export function drawPcbNoteDimension(params: DrawPcbNoteDimensionParams): void {
  const { ctx, pcbNoteDimension, realToCanvasMat } = params

  const color = pcbNoteDimension.color ?? DEFAULT_NOTE_COLOR

  drawDimensionCommon({
    ctx,
    dimension: pcbNoteDimension,
    realToCanvasMat,
    color,
  })
}
