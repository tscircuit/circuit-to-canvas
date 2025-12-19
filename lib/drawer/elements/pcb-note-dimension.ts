import type { PcbNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawText } from "../shapes/text"
import { drawArrow } from "../shapes/arrow"

export interface DrawPcbNoteDimensionParams {
  ctx: CanvasContext
  pcbNoteDimension: PcbNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_NOTE_COLOR = "rgba(255,255,255,0.5)"

export function drawPcbNoteDimension(params: DrawPcbNoteDimensionParams): void {
  const { ctx, pcbNoteDimension, realToCanvasMat } = params

  const color = pcbNoteDimension.color ?? DEFAULT_NOTE_COLOR
  const arrowSize = pcbNoteDimension.arrow_size

  // Store real (model) endpoints for extension lines
  const realFromX = pcbNoteDimension.from.x
  const realFromY = pcbNoteDimension.from.y
  const realToX = pcbNoteDimension.to.x
  const realToY = pcbNoteDimension.to.y

  // Calculate the dimension line endpoints (real/model coords)
  let fromX = realFromX
  let fromY = realFromY
  let toX = realToX
  let toY = realToY

  // Track if we have an offset (for drawing extension lines)
  let hasOffset = false
  let offsetX = 0
  let offsetY = 0

  // Apply offset if provided
  if (pcbNoteDimension.offset_distance && pcbNoteDimension.offset_direction) {
    const dirX = pcbNoteDimension.offset_direction.x
    const dirY = pcbNoteDimension.offset_direction.y
    const length = Math.hypot(dirX, dirY)
    if (length > 0) {
      const normX = dirX / length
      const normY = dirY / length
      hasOffset = true
      offsetX = pcbNoteDimension.offset_distance * normX
      offsetY = pcbNoteDimension.offset_distance * normY
      fromX += offsetX
      fromY += offsetY
      toX += offsetX
      toY += offsetY
    }
  }

  // Calculate stroke width to match text stroke width
  // Text uses fontSize * STROKE_WIDTH_RATIO (0.13) with minimum 0.35
  const STROKE_WIDTH_RATIO = 0.13

  const strokeWidth = Math.max(
    pcbNoteDimension.font_size * STROKE_WIDTH_RATIO,
    0.35,
  )

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
  if (pcbNoteDimension.text) {
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
      const offsetDistance = pcbNoteDimension.font_size * 1.5 // Offset by 1.5x font size
      const normalizedPerpX = perpX / perpLength
      const normalizedPerpY = perpY / perpLength
      textX += normalizedPerpX * offsetDistance
      textY += normalizedPerpY * offsetDistance
    }

    // Calculate rotation (displayed CCW degrees). If the caller provided
    // `text_ccw_rotation` use that directly; otherwise align with the line
    // angle and keep the text upright by folding into [-90, 90]. `drawText`
    // expects a rotation value that it will negate internally, so we pass
    // `-deg` below.
    // Compute the displayed CCW degrees. Use the explicit `text_ccw_rotation`
    // when provided; otherwise derive from the line angle and fold into
    // [-90, 90] so text stays upright. Finally, `drawText` negates the
    // provided rotation when applying it to the canvas, so pass the
    // negative of the displayed CCW degrees.
    const textRotation = -(() => {
      const raw =
        pcbNoteDimension.text_ccw_rotation ?? (lineAngle * 180) / Math.PI

      if (pcbNoteDimension.text_ccw_rotation !== undefined) return raw

      // Normalize to [-180, 180]
      let deg = ((raw + 180) % 360) - 180

      // Fold into [-90, 90]
      if (deg > 90) deg -= 180
      if (deg < -90) deg += 180

      return deg
    })()

    drawText({
      ctx,
      text: pcbNoteDimension.text,
      x: textX,
      y: textY,
      fontSize: pcbNoteDimension.font_size,
      color,
      realToCanvasMat: realToCanvasMat,
      anchorAlignment: "center",
      rotation: textRotation,
    })
  }
}
