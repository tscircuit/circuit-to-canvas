import type { PcbSilkscreenText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawText, type AnchorAlignment } from "../shapes/text"

export interface DrawPcbSilkscreenTextParams {
  ctx: CanvasContext
  text: PcbSilkscreenText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

function mapAnchorAlignment(alignment?: string): AnchorAlignment {
  if (!alignment) return "center"
  return alignment as AnchorAlignment
}

/**
 * Keep silkscreen text readable regardless of the component's rotation.
 *
 * KiCad plots footprint text "keep upright": any angle that would render the
 * text upside-down (in the (90°, 270°] half) is flipped by 180°. Without this,
 * a component rotated 180° gets an upside-down reference designator and one
 * rotated 270° gets an upside-down-vertical one — unreadable on the board and
 * a divergence from KiCad.
 */
function keepTextUpright(rotation: number): number {
  const a = ((rotation % 360) + 360) % 360
  return a > 90 && a <= 270 ? a - 180 : a
}

export function drawPcbSilkscreenText(
  params: DrawPcbSilkscreenTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  const color = layerToSilkscreenColor(text.layer, colorMap)
  const alignment = mapAnchorAlignment(text.anchor_alignment)
  const fontSize = text.font_size ?? 1

  drawText({
    ctx,
    text: content,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment: alignment,
    rotation: keepTextUpright(text.ccw_rotation ?? 0),
    mirrorX: text.layer === "bottom",
    knockout: text.is_knockout,
    knockoutPadding: text.is_knockout ? text.knockout_padding : undefined,
  })
}
