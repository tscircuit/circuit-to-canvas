import type { PcbFabricationNoteDimension } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"

export interface DrawPcbFabricationNoteDimensionParams {
  ctx: CanvasContext
  dimension: PcbFabricationNoteDimension
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // Fabrication notes typically use a default color, but can be customized
  return "rgb(255, 255, 255)"
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
    const fontSize = dimension.font_size * Math.abs(transform.a)
    const rotation = dimension.text_ccw_rotation ?? 0

    // Calculate text position (midpoint of the dimension line)
    let textX = (fromX + toX) / 2
    let textY = (fromY + toY) / 2

    // Apply offset if provided
    if (
      dimension.offset !== undefined ||
      dimension.offset_distance !== undefined
    ) {
      const offsetDistance = dimension.offset_distance ?? dimension.offset ?? 0
      const scaledOffset = offsetDistance * Math.abs(transform.a)

      // Calculate perpendicular direction for offset
      let offsetDirX = -dy
      let offsetDirY = dx
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

      textX += offsetDirX * scaledOffset
      textY += offsetDirY * scaledOffset
    }

    ctx.save()
    ctx.translate(textX, textY)

    // Apply rotation (CCW rotation in degrees)
    if (rotation !== 0) {
      ctx.rotate(-rotation * (Math.PI / 180))
    }

    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(dimension.text, 0, 0)
    ctx.restore()
  }
}
