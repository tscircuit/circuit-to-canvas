import type { Matrix } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"

export interface DrawPcbSoldermaskParams {
  ctx: CanvasContext
  board: import("circuit-json").PcbBoard
  elements: import("circuit-json").AnyCircuitElement[]
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer: "top" | "bottom"
}
