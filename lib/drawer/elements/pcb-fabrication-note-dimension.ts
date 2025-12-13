import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawArrowHead } from "../shapes/arrow"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  dimension: PcbFabricationNoteDimension
  transform: Matrix
  colorMap: PcbColorMap
}

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, dimension, transform, colorMap } = params

  // Use the color from the dimension if provided, otherwise use a default color
  // Fabrication notes are typically shown in a distinct color
  const defaultColor = "rgba(255,255,255,0.5)" // White color for fabrication notes
  const color = dimension.color ?? defaultColor

  const [fromX, fromY] = applyToPoint(transform, [
    dimension.from.x,
    dimension.from.y,
  ])
  const [toX, toY] = applyToPoint(transform, [dimension.to.x, dimension.to.y])

  // Calculate the direction vector and angle of the dimension line
  const dx = toX - fromX
  const dy = toY - fromY
  const lineLength = Math.sqrt(dx * dx + dy * dy)
  const lineAngle = Math.atan2(dy, dx)

  // Calculate arrow size (scaled by transform)
  const arrowSize = (dimension.arrow_size ?? 1) * Math.abs(transform.a)

  // Handle offset and offset_direction for extension lines
  let dimensionLineStartX = fromX
  let dimensionLineStartY = fromY
  let dimensionLineEndX = toX
  let dimensionLineEndY = toY

  if (dimension.offset || dimension.offset_distance) {
    const offsetDist =
      (dimension.offset_distance ?? dimension.offset ?? 0) *
      Math.abs(transform.a)

    // Calculate perpendicular direction for offset
    let offsetDirX = 0
    let offsetDirY = 0

    if (dimension.offset_direction) {
      // Use provided offset direction
      const dirLength = Math.sqrt(
        dimension.offset_direction.x ** 2 + dimension.offset_direction.y ** 2,
      )
      if (dirLength > 0) {
        offsetDirX = (dimension.offset_direction.x / dirLength) * offsetDist
        offsetDirY = (dimension.offset_direction.y / dirLength) * offsetDist
      }
    } else {
      // Calculate perpendicular to the dimension line
      const perpX = -dy / lineLength
      const perpY = dx / lineLength
      offsetDirX = perpX * offsetDist
      offsetDirY = perpY * offsetDist
    }

    // Draw extension lines from from/to points to the dimension line
    const extFromX = fromX + offsetDirX
    const extFromY = fromY + offsetDirY
    const extToX = toX + offsetDirX
    const extToY = toY + offsetDirY

    // Extension lines
    drawLine({
      ctx,
      start: { x: fromX, y: fromY },
      end: { x: extFromX, y: extFromY },
      strokeWidth: 0.1 * Math.abs(transform.a),
      stroke: color,
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    })

    drawLine({
      ctx,
      start: { x: toX, y: toY },
      end: { x: extToX, y: extToY },
      strokeWidth: 0.1 * Math.abs(transform.a),
      stroke: color,
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    })

    // Update dimension line endpoints
    dimensionLineStartX = extFromX
    dimensionLineStartY = extFromY
    dimensionLineEndX = extToX
    dimensionLineEndY = extToY
  }

  // Draw the main dimension line
  drawLine({
    ctx,
    start: { x: dimensionLineStartX, y: dimensionLineStartY },
    end: { x: dimensionLineEndX, y: dimensionLineEndY },
    strokeWidth: 0.1 * Math.abs(transform.a),
    stroke: color,
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
  })

  // Draw arrow heads at both ends
  // Arrow at start (pointing towards the line)
  drawArrowHead({
    ctx,
    x: dimensionLineStartX,
    y: dimensionLineStartY,
    angle: lineAngle + Math.PI,
    size: arrowSize,
    color,
  })

  // Arrow at end (pointing towards the line)
  drawArrowHead({
    ctx,
    x: dimensionLineEndX,
    y: dimensionLineEndY,
    angle: lineAngle,
    size: arrowSize,
    color,
  })

  // Draw text if provided
  if (dimension.text) {
    const fontSize = (dimension.font_size ?? 1) * Math.abs(transform.a)
    const rotation = dimension.text_ccw_rotation ?? 0

    // Calculate text position (middle of dimension line)
    const textX = (dimensionLineStartX + dimensionLineEndX) / 2
    const textY = (dimensionLineStartY + dimensionLineEndY) / 2

    ctx.save()
    ctx.translate(textX, textY)

    // Apply rotation (CCW rotation in degrees)
    if (rotation !== 0) {
      ctx.rotate(-rotation * (Math.PI / 180))
    } else {
      // If no explicit rotation, rotate to align with dimension line
      ctx.rotate(lineAngle)
    }

    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(dimension.text, 0, 0)
    ctx.restore()
  }
}
