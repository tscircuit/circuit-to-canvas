import type { PcbFabricationNoteText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"

export interface DrawPcbFabricationNoteTextParams {
  ctx: CanvasContext
  text: PcbFabricationNoteText
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // Fabrication notes typically use a default color, but can be customized
  // Using a default color for now, can be overridden by text.color
  return "rgb(255, 255, 255)"
}

function mapAnchorAlignment(
  alignment:
    | "center"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right",
): "start" | "end" | "left" | "right" | "center" {
  if (alignment.includes("left")) return "left"
  if (alignment.includes("right")) return "right"
  return "center"
}

function mapTextBaseline(
  alignment:
    | "center"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right",
): "top" | "middle" | "bottom" {
  if (alignment.includes("top")) return "top"
  if (alignment.includes("bottom")) return "bottom"
  return "middle"
}

export function drawPcbFabricationNoteText(
  params: DrawPcbFabricationNoteTextParams,
): void {
  const { ctx, text, transform, colorMap } = params

  const defaultColor = layerToColor(text.layer, colorMap)
  const color = text.color ?? defaultColor

  const [x, y] = applyToPoint(transform, [
    text.anchor_position.x,
    text.anchor_position.y,
  ])

  const fontSize = text.font_size * Math.abs(transform.a)
  // Support optional rotation (may not be in type definition but could be present)
  const rotation =
    "ccw_rotation" in text ? ((text as any).ccw_rotation ?? 0) : 0

  ctx.save()
  ctx.translate(x, y)

  // Apply rotation (CCW rotation in degrees)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.font = `${fontSize}px sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = mapAnchorAlignment(text.anchor_alignment)
  ctx.textBaseline = mapTextBaseline(text.anchor_alignment)
  ctx.fillText(text.text, 0, 0)
  ctx.restore()
}
