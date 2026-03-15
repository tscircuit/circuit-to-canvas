import type { NinePointAnchor, PcbCopperText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../types"
import { drawText } from "../shapes/text"

export interface DrawPcbCopperTextParams {
  ctx: CanvasContext
  text: PcbCopperText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function mapAnchorAlignment(alignment?: string): NinePointAnchor {
  // Vertical component is intentionally collapsed to center; callers only care about left/center/right.
  if (!alignment) return "center"
  if (alignment.includes("left")) return "center_left"
  if (alignment.includes("right")) return "center_right"
  return "center"
}

export function drawPcbCopperText(params: DrawPcbCopperTextParams): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  const textColor =
    colorMap.copper[text.layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  const alignment = mapAnchorAlignment(text.anchor_alignment)

  drawText({
    ctx,
    text: content,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize: text.font_size ?? 1,
    color: textColor,
    realToCanvasMat,
    anchorAlignment: alignment,
    rotation: text.ccw_rotation ?? 0,
    mirrorX: text.is_mirrored,
    knockout: text.is_knockout,
    knockoutPadding: text.is_knockout ? text.knockout_padding : undefined,
  })
}
