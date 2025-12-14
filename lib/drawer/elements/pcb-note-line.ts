import type { PcbNoteLine } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"

export interface DrawPcbNoteLineParams {
  ctx: CanvasContext
  line: PcbNoteLine
  transform: Matrix
  colorMap: PcbColorMap
}

export function drawPcbNoteLine(params: DrawPcbNoteLineParams): void {
  const { ctx, line, transform, colorMap } = params

  // Use the color from the line if provided, otherwise use a default color
  // Notes are typically shown in a distinct color
  const defaultColor = "rgb(89, 148, 220)" // Blue color for notes
  const color = line.color ?? defaultColor

  const isDashed = line.is_dashed ?? false

  drawLine({
    ctx,
    start: { x: line.x1, y: line.y1 },
    end: { x: line.x2, y: line.y2 },
    strokeWidth: line.stroke_width ?? 0.1,
    stroke: color,
    transform,
    isDashed,
  })
}
