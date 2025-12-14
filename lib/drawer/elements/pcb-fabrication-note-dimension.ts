import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawArrowHead } from "../shapes/arrow"
import { drawText, getAlphabetLayout } from "../shapes/text"

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
    const fontSize = dimension.font_size ?? 1
    const rotation = dimension.text_ccw_rotation ?? 0

    // Calculate text position (middle of dimension line in real-world coordinates)
    const midX = (dimension.from.x + dimension.to.x) / 2
    const midY = (dimension.from.y + dimension.to.y) / 2

    // Calculate perpendicular direction for offset (to position text above the line)
    // Perpendicular vector: (-dy, dx) normalized
    const realDx = dimension.to.x - dimension.from.x
    const realDy = dimension.to.y - dimension.from.y
    const realLineLength = Math.sqrt(realDx * realDx + realDy * realDy)

    // Get text layout to calculate height for offset
    const layout = getAlphabetLayout(dimension.text, fontSize)
    // Total text height includes descender depth
    const textHeight =
      layout.height + layout.descenderDepth + layout.strokeWidth

    // Offset text above the line (perpendicular direction)
    // Use a default offset of 1.5x the text height (from baseline)
    const textOffset = textHeight * 1.5

    let offsetX = 0
    let offsetY = 0

    if (realLineLength > 0) {
      // Perpendicular vector pointing "up" (counter-clockwise 90 degrees)
      const perpX = -realDy / realLineLength
      const perpY = realDx / realLineLength
      offsetX = perpX * textOffset
      offsetY = perpY * textOffset
    } else {
      // If line has no length, just offset upward
      offsetY = -textOffset
    }

    // Calculate baseline position (where we want the text baseline to be)
    const baselineX = midX + offsetX
    const baselineY = midY + offsetY

    // Determine rotation: use explicit rotation if provided, otherwise align with line
    // Calculate real-world line angle for rotation
    const realLineAngle =
      realLineLength > 0 ? (Math.atan2(realDy, realDx) * 180) / Math.PI : 0
    const textRotation = rotation !== 0 ? rotation : realLineAngle

    // Draw text using @tscircuit/alphabet with baseline alignment
    // Use "bottom" alignment: the bottom of text (including descenders) aligns with anchor
    // We want the baseline to align, so adjust y position to account for descender depth
    // Baseline is at: anchorY - descenderDepth from bottom
    const textAnchorY = baselineY + layout.descenderDepth

    drawText({
      ctx,
      text: dimension.text,
      x: baselineX,
      y: textAnchorY,
      fontSize,
      color,
      transform,
      anchorAlignment: "bottom",
      rotation: textRotation,
    })
  }
}
