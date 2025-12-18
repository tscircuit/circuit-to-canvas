import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawText, getAlphabetLayout } from "../shapes/text"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  dimension: PcbFabricationNoteDimension
  transform: Matrix
  colorMap: PcbColorMap
}

// Re-export the interface for convenience
export type { PcbFabricationNoteDimension }

const DEFAULT_FABRICATION_NOTE_COLOR = "rgba(255,255,255,0.5)"

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // For fabrication notes, we use a default color
  // Could be extended to support per-layer colors in the future
  return DEFAULT_FABRICATION_NOTE_COLOR
}

/**
 * Draw an arrow at a point along a line
 */
function drawArrow(
  ctx: CanvasContext,
  x: number,
  y: number,
  angle: number,
  arrowSize: number,
  color: string,
  strokeWidth: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-arrowSize, -arrowSize / 2)
  ctx.moveTo(0, 0)
  ctx.lineTo(-arrowSize, arrowSize / 2)

  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()

  ctx.restore()
}

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, dimension, transform, colorMap } = params

  const defaultColor = layerToColor(dimension.layer, colorMap)
  const color = dimension.color ?? defaultColor
  const arrowSize = dimension.arrow_size

  // Store original endpoints for extension lines
  const originalFromX = dimension.from.x
  const originalFromY = dimension.from.y
  const originalToX = dimension.to.x
  const originalToY = dimension.to.y

  // Calculate the dimension line endpoints
  let fromX = originalFromX
  let fromY = originalFromY
  let toX = originalToX
  let toY = originalToY

  // Track if we have an offset (for drawing extension lines)
  let hasOffset = false
  let offsetX = 0
  let offsetY = 0

  // Apply offset if provided
  if (dimension.offset !== undefined) {
    hasOffset = true
    offsetX = dimension.offset
    offsetY = 0
    fromX += offsetX
    fromY += offsetY
    toX += offsetX
    toY += offsetY
  } else if (
    dimension.offset_distance !== undefined &&
    dimension.offset_direction
  ) {
    hasOffset = true
    offsetX = dimension.offset_distance * dimension.offset_direction.x
    offsetY = dimension.offset_distance * dimension.offset_direction.y
    fromX += offsetX
    fromY += offsetY
    toX += offsetX
    toY += offsetY
  }

  // Calculate stroke width to match text stroke width
  // Text uses fontSize * STROKE_WIDTH_RATIO (0.13) with minimum 0.35
  const STROKE_WIDTH_RATIO = 0.13
  const textStrokeWidth = Math.max(
    dimension.font_size * STROKE_WIDTH_RATIO,
    0.35,
  )
  const strokeWidth = textStrokeWidth

  // Draw extension lines if offset is provided
  if (hasOffset) {
    // Extension line from original 'from' point to offset 'from' point
    drawLine({
      ctx,
      start: { x: originalFromX, y: originalFromY },
      end: { x: fromX, y: fromY },
      strokeWidth,
      stroke: color,
      transform,
    })

    // Extension line from original 'to' point to offset 'to' point
    drawLine({
      ctx,
      start: { x: originalToX, y: originalToY },
      end: { x: toX, y: toY },
      strokeWidth,
      stroke: color,
      transform,
    })
  }

  // Draw the dimension line
  drawLine({
    ctx,
    start: { x: fromX, y: fromY },
    end: { x: toX, y: toY },
    strokeWidth,
    stroke: color,
    transform,
  })

  // Calculate angle for arrows
  const dx = toX - fromX
  const dy = toY - fromY
  const lineAngle = Math.atan2(dy, dx)

  // Draw arrows at both ends
  const [transformedFromX, transformedFromY] = applyToPoint(transform, [
    fromX,
    fromY,
  ])
  const [transformedToX, transformedToY] = applyToPoint(transform, [toX, toY])
  const scale = Math.abs(transform.a)
  const scaledArrowSize = arrowSize * scale
  const scaledStrokeWidth = strokeWidth * scale

  // Arrow at 'from' point (pointing outward, away from the line center)
  // This means pointing in the direction opposite to 'to'
  drawArrow(
    ctx,
    transformedFromX,
    transformedFromY,
    lineAngle + Math.PI,
    scaledArrowSize,
    color,
    scaledStrokeWidth,
  )

  // Arrow at 'to' point (pointing outward, away from the line center)
  // This means pointing in the direction toward 'to' (away from 'from')
  drawArrow(
    ctx,
    transformedToX,
    transformedToY,
    lineAngle,
    scaledArrowSize,
    color,
    scaledStrokeWidth,
  )

  // Draw text if provided
  if (dimension.text) {
    // Calculate text position (midpoint of the dimension line)
    // The line endpoints are already offset if offset was provided
    let textX = (fromX + toX) / 2
    let textY = (fromY + toY) / 2

    // Offset text perpendicular to the dimension line so it appears above/outside
    // Calculate perpendicular vector (rotate line direction by 90 degrees CW)
    // For a line from (fromX, fromY) to (toX, toY), perpendicular is (dy, -dx)
    // This ensures text appears above horizontal lines and to the right of vertical lines
    const perpX = toY - fromY
    const perpY = -(toX - fromX)
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY)

    // Normalize and offset by font size (plus a small gap)
    if (perpLength > 0) {
      const offsetDistance = dimension.font_size * 1.5 // Offset by 1.5x font size
      const normalizedPerpX = perpX / perpLength
      const normalizedPerpY = perpY / perpLength
      textX += normalizedPerpX * offsetDistance
      textY += normalizedPerpY * offsetDistance
    }

    // Calculate rotation for text
    let textRotation = 0
    if (dimension.text_ccw_rotation !== undefined) {
      textRotation = dimension.text_ccw_rotation
    } else {
      // Default: rotate text to align with dimension line
      textRotation = (lineAngle * 180) / Math.PI
    }

    drawText({
      ctx,
      text: dimension.text,
      x: textX,
      y: textY,
      fontSize: dimension.font_size,
      color,
      transform,
      anchorAlignment: "center",
      rotation: textRotation,
    })
  }
}
