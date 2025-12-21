import type {
  PcbSilkscreenText,
  PcbSilkscreenRect,
  PcbSilkscreenCircle,
  PcbSilkscreenLine,
  PcbSilkscreenPath,
  PcbSilkscreenPill,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"
import { drawCircle } from "../shapes/circle"
import { drawLine } from "../shapes/line"
import { drawPath } from "../shapes/path"
import { drawPill } from "../shapes/pill"
import {
  getAlphabetLayout,
  strokeAlphabetText,
  getTextStartPosition,
  type AnchorAlignment,
} from "../shapes/text"

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

export interface DrawPcbSilkscreenPillParams {
  ctx: CanvasContext
  pill: PcbSilkscreenPill
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

export function drawPcbSilkscreenText(
  params: DrawPcbSilkscreenTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  const color = layerToSilkscreenColor(text.layer, colorMap)
  const [x, y] = applyToPoint(realToCanvasMat, [
    text.anchor_position.x,
    text.anchor_position.y,
  ])
  const scale = Math.abs(realToCanvasMat.a)
  const fontSize = (text.font_size ?? 1) * scale
  const rotation = text.ccw_rotation ?? 0

  const layout = getAlphabetLayout(content, fontSize)
  const alignment = mapAnchorAlignment(text.anchor_alignment)
  const startPos = getTextStartPosition(alignment, layout)

  ctx.save()
  ctx.translate(x, y)

  // Apply rotation (CCW rotation in degrees)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  if (text.layer === "bottom") {
    ctx.scale(-1, 1)
  }

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color

  strokeAlphabetText(ctx, content, layout, startPos.x, startPos.y)

  ctx.restore()
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

export function drawPcbSilkscreenPill(
  params: DrawPcbSilkscreenPillParams,
): void {
  const { ctx, pill, realToCanvasMat, colorMap } = params

  const color = layerToSilkscreenColor(pill.layer, colorMap)
  const strokeWidth = (pill as { stroke_width?: number }).stroke_width ?? 0.2

  // Draw as boundary/outline, not filled
  drawPill({
    ctx,
    center: pill.center,
    width: pill.width,
    height: pill.height,
    stroke: color,
    strokeWidth,
    realToCanvasMat,
  })
}
