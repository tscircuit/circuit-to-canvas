import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawText } from "../shapes/text"
import { drawArrow } from "../shapes/arrow"

/**
 * Common dimension properties shared between different dimension types
 */
export interface CommonDimensionProperties {
  from: { x: number; y: number }
  to: { x: number; y: number }
  offset_distance?: number
  offset_direction?: { x: number; y: number }
  text?: string
  text_ccw_rotation?: number
  font_size: number
  arrow_size: number
  color?: string
}

export interface DrawDimensionCommonParams {
  ctx: CanvasContext
  dimension: CommonDimensionProperties
  realToCanvasMat: Matrix
  color: string
}

/**
 * Shared function to draw dimension lines, arrows, and text.
 * This handles the common logic for drawing dimensions.
 */
export function drawDimensionCommon(params: DrawDimensionCommonParams): void {
  const { ctx, dimension, realToCanvasMat, color } = params

  const arrowSize = dimension.arrow_size

  // Store real (model) endpoints for extension lines
  const realFromX = dimension.from.x
  const realFromY = dimension.from.y
  const realToX = dimension.to.x
  const realToY = dimension.to.y

  // Calculate the dimension line endpoints (real/model coords)
  let fromX = realFromX
  let fromY = realFromY
  let toX = realToX
  let toY = realToY

  // Apply offset if provided
  let hasOffset = false
  if (dimension.offset_distance && dimension.offset_direction) {
    const dirX = dimension.offset_direction.x
    const dirY = dimension.offset_direction.y
    const length = Math.hypot(dirX, dirY)
    if (length > 0) {
      hasOffset = true
      const offsetX = (dimension.offset_distance * dirX) / length
      const offsetY = (dimension.offset_distance * dirY) / length
      fromX += offsetX
      fromY += offsetY
      toX += offsetX
      toY += offsetY
    }
  }

  // Calculate stroke width to match text stroke width
  // Text uses fontSize * STROKE_WIDTH_RATIO (0.13) with minimum 0.35
  const STROKE_WIDTH_RATIO = 0.13

  const strokeWidth = Math.max(dimension.font_size * STROKE_WIDTH_RATIO, 0.35)

  // Draw extension lines if offset is provided
  if (hasOffset) {
    // Extension line from original 'from' point to offset 'from' point
    drawLine({
      ctx,
      start: { x: realFromX, y: realFromY },
      end: { x: fromX, y: fromY },
      strokeWidth,
      stroke: color,
      realToCanvasMat: realToCanvasMat,
    })

    // Extension line from original 'to' point to offset 'to' point
    drawLine({
      ctx,
      start: { x: realToX, y: realToY },
      end: { x: toX, y: toY },
      strokeWidth,
      stroke: color,
      realToCanvasMat: realToCanvasMat,
    })
  }

  // Draw the dimension line
  drawLine({
    ctx,
    start: { x: fromX, y: fromY },
    end: { x: toX, y: toY },
    strokeWidth,
    stroke: color,
    realToCanvasMat: realToCanvasMat,
  })

  // Draw arrows at both ends
  const [canvasFromX, canvasFromY] = applyToPoint(realToCanvasMat, [
    fromX,
    fromY,
  ])
  const [canvasToX, canvasToY] = applyToPoint(realToCanvasMat, [toX, toY])
  // Calculate angle for arrows in canvas coordinates
  const canvasDx = canvasToX - canvasFromX
  const canvasDy = canvasToY - canvasFromY
  const lineAngle = Math.atan2(canvasDy, canvasDx)
  const scale = Math.abs(realToCanvasMat.a)
  const scaledArrowSize = arrowSize * scale
  const scaledStrokeWidth = strokeWidth * scale

  // Arrow at 'from' point (pointing outward, away from the line center)
  // This means pointing in the direction opposite to 'to'
  drawArrow({
    ctx,
    x: canvasFromX,
    y: canvasFromY,
    angle: lineAngle + Math.PI,
    arrowSize: scaledArrowSize,
    color,
    strokeWidth: scaledStrokeWidth,
  })

  // Arrow at 'to' point (pointing outward, away from the line center)
  // This means pointing in the direction toward 'to' (away from 'from')
  drawArrow({
    ctx,
    x: canvasToX,
    y: canvasToY,
    angle: lineAngle,
    arrowSize: scaledArrowSize,
    color,
    strokeWidth: scaledStrokeWidth,
  })

  // Draw text if provided
  if (dimension.text) {
    // Calculate text position (midpoint of the dimension line)
    let textX = (fromX + toX) / 2
    let textY = (fromY + toY) / 2

    // Offset text perpendicular to the dimension line
    const perpX = toY - fromY
    const perpY = -(toX - fromX)
    const perpLength = Math.hypot(perpX, perpY)

    if (perpLength > 0) {
      const offsetDistance = dimension.font_size * 1.5
      textX += (perpX / perpLength) * offsetDistance
      textY += (perpY / perpLength) * offsetDistance
    }

    // Calculate text rotation: use explicit rotation if provided,
    // otherwise align with line and fold into [-90, 90] to keep text upright
    let deg = dimension.text_ccw_rotation ?? (lineAngle * 180) / Math.PI
    if (dimension.text_ccw_rotation === undefined) {
      deg = ((deg + 180) % 360) - 180
      if (deg > 90) deg -= 180
      if (deg < -90) deg += 180
    }

    drawText({
      ctx,
      text: dimension.text,
      x: textX,
      y: textY,
      fontSize: dimension.font_size,
      color,
      realToCanvasMat: realToCanvasMat,
      anchorAlignment: "center",
      rotation: -deg,
    })
  }
}
