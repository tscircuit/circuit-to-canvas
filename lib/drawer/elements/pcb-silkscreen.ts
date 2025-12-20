import type {
  PcbSilkscreenText,
  PcbSilkscreenRect,
  PcbSilkscreenCircle,
  PcbSilkscreenLine,
  PcbSilkscreenPath,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"
import { drawCircle } from "../shapes/circle"
import { drawLine } from "../shapes/line"
import { drawPath } from "../shapes/path"
import { drawText } from "../shapes/text"

export interface DrawPcbSilkscreenTextParams {
  ctx: CanvasContext
  text: PcbSilkscreenText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export interface DrawPcbSilkscreenRectParams {
  ctx: CanvasContext
  rect: PcbSilkscreenRect
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export interface DrawPcbSilkscreenCircleParams {
  ctx: CanvasContext
  circle: PcbSilkscreenCircle
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export interface DrawPcbSilkscreenLineParams {
  ctx: CanvasContext
  line: PcbSilkscreenLine
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

export interface DrawPcbSilkscreenPathParams {
  ctx: CanvasContext
  path: PcbSilkscreenPath
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

export function drawPcbSilkscreenText(
  params: DrawPcbSilkscreenTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(text.layer, colorMap)
  const fontSize = text.font_size ?? 1
  const rotation = text.ccw_rotation ?? 0

  // Use @tscircuit/alphabet to draw text (font-independent, stroke-based rendering)
  drawText({
    ctx,
    text: text.text,
    x: text.anchor_position.x,
    y: text.anchor_position.y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment: text.anchor_alignment ?? "center",
    rotation,
  })
}

export function drawPcbSilkscreenRect(
  params: DrawPcbSilkscreenRectParams,
): void {
  const { ctx, rect, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(rect.layer, colorMap)

  drawRect({
    ctx,
    center: rect.center,
    width: rect.width,
    height: rect.height,
    fill: color,
    realToCanvasMat,
  })
}

export function drawPcbSilkscreenCircle(
  params: DrawPcbSilkscreenCircleParams,
): void {
  const { ctx, circle, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(circle.layer, colorMap)

  drawCircle({
    ctx,
    center: circle.center,
    radius: circle.radius,
    fill: color,
    realToCanvasMat,
  })
}

export function drawPcbSilkscreenLine(
  params: DrawPcbSilkscreenLineParams,
): void {
  const { ctx, line, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(line.layer, colorMap)

  drawLine({
    ctx,
    start: { x: line.x1, y: line.y1 },
    end: { x: line.x2, y: line.y2 },
    strokeWidth: line.stroke_width ?? 0.1,
    stroke: color,
    realToCanvasMat,
  })
}

export function drawPcbSilkscreenPath(
  params: DrawPcbSilkscreenPathParams,
): void {
  const { ctx, path, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(path.layer, colorMap)

  if (!path.route || path.route.length < 2) return

  // Draw each segment of the path
  for (let i = 0; i < path.route.length - 1; i++) {
    const start = path.route[i]
    const end = path.route[i + 1]

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
