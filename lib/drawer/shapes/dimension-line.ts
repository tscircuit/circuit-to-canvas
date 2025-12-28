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
  textRotation?: number
  offset?: {
    distance: number
    direction: { x: number; y: number }
  }
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
    textRotation: manualTextRotation,
    offset,
  } = params

  const STROKE_WIDTH_RATIO = 0.13
  const strokeWidth =
    manualStrokeWidth ?? Math.max(fontSize * STROKE_WIDTH_RATIO, 0.05)

  let fromX = from.x
  let fromY = from.y
  let toX = to.x
  let toY = to.y

  // Handle offset and extension lines
  if (offset && offset.distance !== 0) {
    const { distance, direction } = offset
    const dirLen = Math.hypot(direction.x, direction.y)
    if (dirLen > 0) {
      const normX = direction.x / dirLen
      const normY = direction.y / dirLen
      const offsetX = distance * normX
      const offsetY = distance * normY

      // Draw extension lines
      drawLine({
        ctx,
        start: { x: from.x, y: from.y },
        end: { x: from.x + offsetX, y: from.y + offsetY },
        strokeWidth,
        stroke: color,
        realToCanvasMat,
      })
      drawLine({
        ctx,
        start: { x: to.x, y: to.y },
        end: { x: to.x + offsetX, y: to.y + offsetY },
        strokeWidth,
        stroke: color,
        realToCanvasMat,
      })

      fromX += offsetX
      fromY += offsetY
      toX += offsetX
      toY += offsetY
    }
  }

  // Draw the main dimension line
  drawLine({
    ctx,
    start: { x: fromX, y: fromY },
    end: { x: toX, y: toY },
    strokeWidth,
    stroke: color,
    realToCanvasMat,
  })

  // Draw arrows
  const [canvasFromX, canvasFromY] = applyToPoint(realToCanvasMat, [
    fromX,
    fromY,
  ])
  const [canvasToX, canvasToY] = applyToPoint(realToCanvasMat, [toX, toY])

  const canvasDx = canvasToX - canvasFromX
  const canvasDy = canvasToY - canvasFromY
  const lineAngle = Math.atan2(canvasDy, canvasDx)
  const scaleValue = Math.abs(realToCanvasMat.a)
  const scaledArrowSize = arrowSize * scaleValue
  const scaledStrokeWidth = strokeWidth * scaleValue

  // Arrow at 'from' (pointing toward 'from' from the line)
  drawArrow({
    ctx,
    x: canvasFromX,
    y: canvasFromY,
    angle: lineAngle + Math.PI,
    arrowSize: scaledArrowSize,
    color,
    strokeWidth: scaledStrokeWidth,
  })

  // Arrow at 'to' (pointing toward 'to' from the line)
  drawArrow({
    ctx,
    x: canvasToX,
    y: canvasToY,
    angle: lineAngle,
    arrowSize: scaledArrowSize,
    color,
    strokeWidth: scaledStrokeWidth,
  })

  // Draw text
  if (text) {
    let textX = (fromX + toX) / 2
    let textY = (fromY + toY) / 2

    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length > 0) {
      const perpX = dy / length
      const perpY = -dx / length
      const offsetDistance = fontSize * 1.5
      textX += perpX * offsetDistance
      textY += perpY * offsetDistance
    }

    const rotation =
      manualTextRotation ??
      -(() => {
        const raw = (lineAngle * 180) / Math.PI
        let deg = ((raw + 180) % 360) - 180
        if (deg > 90) deg -= 180
        if (deg < -90) deg += 180
        return deg
      })()

    drawText({
      ctx,
      text,
      x: textX,
      y: textY,
      fontSize,
      color,
      realToCanvasMat,
      anchorAlignment: "center",
      rotation,
    })
  }
}
