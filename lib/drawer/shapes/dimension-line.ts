import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawLine } from "./line"
import { drawText } from "./text"
import { drawArrow } from "./arrow"

export interface DrawDimensionLineParams {
  ctx: CanvasContext
  from: { x: number; y: number }
  to: { x: number; y: number }
  realToCanvasMat: Matrix
  color: string
  fontSize: number
  arrowSize?: number
  strokeWidth?: number
  text?: string
  textRotation?: number // CCW rotation in degrees
  offset?: {
    distance: number
    direction: { x: number; y: number }
  }
}

const TEXT_OFFSET_MULTIPLIER = 1.5
const CHARACTER_WIDTH_MULTIPLIER = 0.6
const TEXT_INTERSECTION_PADDING_MULTIPLIER = 0.3

function normalize(v: { x: number; y: number }) {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

export function drawDimensionLine(params: DrawDimensionLineParams): void {
  const {
    ctx,
    from,
    to,
    realToCanvasMat,
    color,
    fontSize,
    arrowSize = 1,
    strokeWidth: manualStrokeWidth,
    text,
    textRotation,
    offset,
  } = params

  const direction = normalize({ x: to.x - from.x, y: to.y - from.y })
  const perpendicular = { x: -direction.y, y: direction.x }

  const hasOffsetDirection =
    offset?.direction &&
    typeof offset.direction.x === "number" &&
    typeof offset.direction.y === "number"

  const normalizedOffsetDirection = hasOffsetDirection
    ? normalize(offset!.direction)
    : { x: 0, y: 0 }

  const offsetMagnitude = offset?.distance ?? 0
  const offsetVector = {
    x: normalizedOffsetDirection.x * offsetMagnitude,
    y: normalizedOffsetDirection.y * offsetMagnitude,
  }

  const fromOffset = { x: from.x + offsetVector.x, y: from.y + offsetVector.y }
  const toOffset = { x: to.x + offsetVector.x, y: to.y + offsetVector.y }

  const fromBase = fromOffset
  const toBase = toOffset

  const scaleValue = Math.abs(realToCanvasMat.a)
  const strokeWidth = manualStrokeWidth ?? arrowSize / 5
  const lineColor = color || "rgba(255,255,255,0.5)"

  // Extension lines (ticks)
  const extensionDirection =
    hasOffsetDirection &&
    (Math.abs(normalizedOffsetDirection.x) > Number.EPSILON ||
      Math.abs(normalizedOffsetDirection.y) > Number.EPSILON)
      ? normalizedOffsetDirection
      : perpendicular

  const extensionLength = offsetMagnitude + 0.5

  const drawExtension = (anchor: { x: number; y: number }) => {
    const endPoint = {
      x: anchor.x + extensionDirection.x * extensionLength,
      y: anchor.y + extensionDirection.y * extensionLength,
    }
    drawLine({
      ctx,
      start: anchor,
      end: endPoint,
      strokeWidth,
      stroke: lineColor,
      realToCanvasMat,
    })
  }

  drawExtension(from)
  drawExtension(to)

  // Main dimension line
  drawLine({
    ctx,
    start: fromBase,
    end: toBase,
    strokeWidth,
    stroke: lineColor,
    realToCanvasMat,
  })

  // Arrows (Keep V-shaped but matching size)
  const [canvasFromX, canvasFromY] = applyToPoint(realToCanvasMat, [
    fromOffset.x,
    fromOffset.y,
  ])
  const [canvasToX, canvasToY] = applyToPoint(realToCanvasMat, [
    toOffset.x,
    toOffset.y,
  ])
  const [canvasToDirX, canvasToDirY] = applyToPoint(realToCanvasMat, [
    toOffset.x + direction.x,
    toOffset.y + direction.y,
  ])

  const canvasLineAngle = Math.atan2(
    canvasToDirY - canvasToY,
    canvasToDirX - canvasToX,
  )

  drawArrow({
    ctx,
    x: canvasFromX,
    y: canvasFromY,
    angle: canvasLineAngle + Math.PI,
    arrowSize: arrowSize * scaleValue,
    color: lineColor,
    strokeWidth: strokeWidth * scaleValue,
  })

  drawArrow({
    ctx,
    x: canvasToX,
    y: canvasToY,
    angle: canvasLineAngle,
    arrowSize: arrowSize * scaleValue,
    color: lineColor,
    strokeWidth: strokeWidth * scaleValue,
  })

  // Text
  if (text) {
    const midPoint = {
      x: (from.x + to.x) / 2 + offsetVector.x,
      y: (from.y + to.y) / 2 + offsetVector.y,
    }

    const [screenFromX, screenFromY] = applyToPoint(realToCanvasMat, [
      fromOffset.x,
      fromOffset.y,
    ])
    const [screenToX, screenToY] = applyToPoint(realToCanvasMat, [
      toOffset.x,
      toOffset.y,
    ])

    const screenDirection = normalize({
      x: screenToX - screenFromX,
      y: screenToY - screenFromY,
    })

    let textAngle =
      (Math.atan2(screenDirection.y, screenDirection.x) * 180) / Math.PI
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180
    }

    const finalTextAngle =
      typeof textRotation === "number" && Number.isFinite(textRotation)
        ? textAngle - textRotation
        : textAngle

    let additionalOffset = 0
    if (
      text &&
      typeof textRotation === "number" &&
      Number.isFinite(textRotation)
    ) {
      const textWidth = text.length * fontSize * CHARACTER_WIDTH_MULTIPLIER
      const textHeight = fontSize
      const rotationRad = (textRotation * Math.PI) / 180
      const sinRot = Math.abs(Math.sin(rotationRad))
      const cosRot = Math.abs(Math.cos(rotationRad))
      const halfWidth = textWidth / 2
      const halfHeight = textHeight / 2
      const maxExtension = halfWidth * sinRot + halfHeight * cosRot
      additionalOffset =
        maxExtension + fontSize * TEXT_INTERSECTION_PADDING_MULTIPLIER
    }

    const textOffset = arrowSize * TEXT_OFFSET_MULTIPLIER + additionalOffset
    const textPoint = {
      x: midPoint.x + perpendicular.x * textOffset,
      y: midPoint.y + perpendicular.y * textOffset,
    }

    drawText({
      ctx,
      text,
      x: textPoint.x,
      y: textPoint.y,
      fontSize,
      color: lineColor,
      realToCanvasMat,
      anchorAlignment: "center",
      rotation: -finalTextAngle, // drawText expects CCW rotation in degrees
    })
  }
}
