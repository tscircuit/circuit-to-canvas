import type {
  PcbFabricationNotePath,
  PcbFabricationNoteRect,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPolygon } from "../shapes/polygon"
import { drawLine } from "../shapes/line"

export interface DrawPcbFabricationNotePathParams {
  ctx: CanvasContext
  // Accept the additive flags before the next circuit-json release.
  path: PcbFabricationNotePath &
    Pick<PcbFabricationNoteRect, "is_filled" | "has_stroke">
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export function drawPcbFabricationNotePath(
  params: DrawPcbFabricationNotePathParams,
): void {
  const { ctx, path, realToCanvasMat, colorMap } = params

  // Use the color from the path if provided, otherwise use a default color
  // Fabrication notes are typically shown in a distinct color
  const defaultColor = colorMap.fabricationNote
  const color = path.color ?? defaultColor

  if (!path.route || path.route.length < 2) return

  if (path.is_filled) {
    drawPolygon({ ctx, points: path.route, fill: color, realToCanvasMat })
  }
  if (path.has_stroke === false || path.stroke_width <= 0) return

  // Filled polygons also close their stroked outline.
  const first = path.route[0]!
  const last = path.route[path.route.length - 1]!
  const route =
    path.is_filled && (first.x !== last.x || first.y !== last.y)
      ? [...path.route, first]
      : path.route

  // Draw each segment of the path
  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i]
    const end = route[i + 1]

    if (!start || !end) continue

    drawLine({
      ctx,
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      strokeWidth: path.stroke_width ?? 0.1,
      stroke: color,
      realToCanvasMat,
    })
  }
}
