import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import { drawText } from "../shapes/text"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  dimension: PcbFabricationNoteDimension
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.fabricationNote.bottom
    : colorMap.fabricationNote.top
}

function drawArrow(
  ctx: CanvasContext,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2)
  ctx.lineTo(-size, size / 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

export function drawPcbFabricationNoteDimension(
  params: DrawPcbFabricationNoteDimensionParams,
): void {
  const { ctx, dimension, transform, colorMap } = params

  const defaultColor = layerToColor(dimension.layer, colorMap)
  const color = dimension.color ?? defaultColor

  const [fromX, fromY] = applyToPoint(transform, [
    dimension.from.x,
    dimension.from.y,
  ])
  const [toX, toY] = applyToPoint(transform, [dimension.to.x, dimension.to.y])

  const scaledArrowSize = dimension.arrow_size * Math.abs(transform.a)

  // Calculate the angle of the dimension line
  const dx = toX - fromX
  const dy = toY - fromY
  const angle = Math.atan2(dy, dx)

  // Draw the main dimension line
  drawLine({
    ctx,
    start: { x: dimension.from.x, y: dimension.from.y },
    end: { x: dimension.to.x, y: dimension.to.y },
    strokeWidth: 0.1,
    stroke: color,
    transform,
  })

  // Draw arrows at both ends
  drawArrow(ctx, fromX, fromY, angle + Math.PI, scaledArrowSize, color)
  drawArrow(ctx, toX, toY, angle, scaledArrowSize, color)

  // Draw text if provided
  if (dimension.text) {
    const rotation = dimension.text_ccw_rotation ?? 0

    // Calculate text position in real-world coordinates (midpoint of the dimension line)
    let textX = (dimension.from.x + dimension.to.x) / 2
    let textY = (dimension.from.y + dimension.to.y) / 2

    // Apply offset if provided (in real-world coordinates)
    if (
      dimension.offset !== undefined ||
      dimension.offset_distance !== undefined
    ) {
      const offsetDistance = dimension.offset_distance ?? dimension.offset ?? 0

      // Calculate perpendicular direction for offset in real-world coordinates
      const realDx = dimension.to.x - dimension.from.x
      const realDy = dimension.to.y - dimension.from.y
      let offsetDirX = -realDy
      let offsetDirY = realDx
      const offsetLength = Math.sqrt(
        offsetDirX * offsetDirX + offsetDirY * offsetDirY,
      )
      if (offsetLength > 0) {
        offsetDirX /= offsetLength
        offsetDirY /= offsetLength
      }

      // Use custom offset direction if provided
      if (dimension.offset_direction) {
        offsetDirX = dimension.offset_direction.x
        offsetDirY = dimension.offset_direction.y
        const dirLength = Math.sqrt(
          offsetDirX * offsetDirX + offsetDirY * offsetDirY,
        )
        if (dirLength > 0) {
          offsetDirX /= dirLength
          offsetDirY /= dirLength
        }
      }

      textX += offsetDirX * offsetDistance
      textY += offsetDirY * offsetDistance
    }

    // Use @tscircuit/alphabet to draw text
    // Pass real-world coordinates and let drawText apply the transform
    drawText({
      ctx,
      text: dimension.text,
      x: textX,
      y: textY,
      fontSize: dimension.font_size,
      color,
      transform,
      anchorAlignment: "center",
      rotation,
    })
  }
}
