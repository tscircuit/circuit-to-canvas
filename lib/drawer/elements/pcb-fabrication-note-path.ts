import type { PcbFabricationNotePath } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPath } from "../shapes/path"

export interface DrawPcbFabricationNotePathParams {
  ctx: CanvasContext
  path: PcbFabricationNotePath
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.fabricationNote.bottom
    : colorMap.fabricationNote.top
}

export function drawPcbFabricationNotePath(
  params: DrawPcbFabricationNotePathParams,
): void {
  const { ctx, path, transform, colorMap } = params

  if (!path.route || path.route.length < 2) return

  const defaultColor = layerToColor(path.layer, colorMap)
  const color = path.color ?? defaultColor

  drawPath({
    ctx,
    points: path.route,
    stroke: color,
    strokeWidth: path.stroke_width,
    transform,
    closePath: false,
  })
}
