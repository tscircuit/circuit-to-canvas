import type { PcbNoteText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawText } from "../shapes/text"

export interface DrawPcbNoteTextParams {
  ctx: CanvasContext
  text: PcbNoteText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbNoteText(params: DrawPcbNoteTextParams): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const defaultColor = colorMap.pcbNote
  const color = text.color ?? defaultColor
  const fontSize = text.font_size ?? 1 // Default to 1mm if not provided

  // Use @tscircuit/alphabet to draw text
  // Pass real-world coordinates and let drawText apply the realToCanvasMat
  drawText({
    ctx,
    text: text.text ?? "",
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment: text.anchor_alignment ?? "center",
  })
}
