import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawText } from "../shapes/text"
import { drawArrow } from "../shapes/arrow"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  pcbFabricationNoteDimension: PcbFabricationNoteDimension
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_FABRICATION_NOTE_COLOR = "rgba(255,255,255,0.5)"

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, pcbFabricationNoteDimension, realToCanvasMat } = params

  const color =
    pcbFabricationNoteDimension.color ?? DEFAULT_FABRICATION_NOTE_COLOR
  const arrowSize = pcbFabricationNoteDimension.arrow_size ?? 1

  const fromX = pcbFabricationNoteDimension.from.x
  const fromY = pcbFabricationNoteDimension.from.y
  const toX = pcbFabricationNoteDimension.to.x
  const toY = pcbFabricationNoteDimension.to.y

  // Calculate stroke width (matching pcb-note-dimension style)
  const STROKE_WIDTH_RATIO = 0.13
  const fontSize = pcbFabricationNoteDimension.font_size ?? 1
  const strokeWidth = Math.max(fontSize * STROKE_WIDTH_RATIO, 0.05)

  // Draw the dimension line
  drawLine({
    ctx,
    start: { x: fromX, y: fromY },
    end: { x: toX, y: toY },
    strokeWidth,
    stroke: color,
    realToCanvasMat,
  })

  // Draw arrows at both ends
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

  // Arrow at 'from' point (pointing toward 'from' from the line)
  drawArrow({
    ctx,
    x: canvasFromX,
    y: canvasFromY,
    angle: lineAngle + Math.PI,
    arrowSize: scaledArrowSize,
    color,
    strokeWidth: scaledStrokeWidth,
  })

  // Arrow at 'to' point (pointing toward 'to' from the line)
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
  if (pcbFabricationNoteDimension.text) {
    let textX = (fromX + toX) / 2
    let textY = (fromY + toY) / 2

    // Offset text perpendicular to the dimension line
    // Calculate perpendicular vector (rotate line direction by 90 degrees CW)
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

    // Determine text rotation
    const textRotation = -(() => {
      // Use explicit rotation if provided, otherwise align with line
      // This is a simplification of pcb-note-dimension.ts logic
      const raw = (lineAngle * 180) / Math.PI

      let deg = ((raw + 180) % 360) - 180
      if (deg > 90) deg -= 180
      if (deg < -90) deg += 180
      return deg
    })()

    drawText({
      ctx,
      text: pcbFabricationNoteDimension.text,
      x: textX,
      y: textY,
      fontSize,
      color,
      realToCanvasMat,
      anchorAlignment: "center",
      rotation: textRotation,
    })
  }
}
