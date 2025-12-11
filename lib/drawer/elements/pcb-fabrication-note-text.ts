import type { PcbFabricationNoteText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawText } from "../shapes/text"

export interface DrawPcbFabricationNoteTextParams {
  ctx: CanvasContext
  text: PcbFabricationNoteText
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.fabricationNote.bottom
    : colorMap.fabricationNote.top
}

export function drawPcbFabricationNoteText(
  params: DrawPcbFabricationNoteTextParams,
): void {
  const { ctx, text, transform, colorMap } = params

  const defaultColor = layerToColor(text.layer, colorMap)
  const color = text.color ?? defaultColor

  const fontSize = text.font_size
  // Support optional rotation (may not be in type definition but could be present)
  const rotation =
    "ccw_rotation" in text ? ((text as any).ccw_rotation ?? 0) : 0

  // Use @tscircuit/alphabet to draw text
  // Pass real-world coordinates and let drawText apply the transform
  drawText({
    ctx,
    text: text.text,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    transform,
    anchorAlignment: text.anchor_alignment,
    rotation,
  })
}
