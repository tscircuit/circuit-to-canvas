import type { PcbFabricationNoteRect } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"

export interface DrawPcbFabricationNoteRectParams {
  ctx: CanvasContext
  rect: PcbFabricationNoteRect
  transform: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  // Fabrication notes typically use a default color, but can be customized
  return "rgb(255, 255, 255)"
}

export function drawPcbFabricationNoteRect(
  params: DrawPcbFabricationNoteRectParams,
): void {
  const { ctx, rect, transform, colorMap } = params

  const defaultColor = layerToColor(rect.layer, colorMap)
  const color = rect.color ?? defaultColor

  const [cx, cy] = applyToPoint(transform, [rect.center.x, rect.center.y])
  const scaledWidth = rect.width * Math.abs(transform.a)
  const scaledHeight = rect.height * Math.abs(transform.a)
  const scaledStrokeWidth = rect.stroke_width * Math.abs(transform.a)
  const scaledCornerRadius = (rect.corner_radius ?? 0) * Math.abs(transform.a)

  ctx.save()
  ctx.translate(cx, cy)

  ctx.beginPath()

  if (scaledCornerRadius > 0) {
    const x = -scaledWidth / 2
    const y = -scaledHeight / 2
    const r = Math.min(scaledCornerRadius, scaledWidth / 2, scaledHeight / 2)

    ctx.moveTo(x + r, y)
    ctx.lineTo(x + scaledWidth - r, y)
    ctx.arcTo(x + scaledWidth, y, x + scaledWidth, y + r, r)
    ctx.lineTo(x + scaledWidth, y + scaledHeight - r)
    ctx.arcTo(
      x + scaledWidth,
      y + scaledHeight,
      x + scaledWidth - r,
      y + scaledHeight,
      r,
    )
    ctx.lineTo(x + r, y + scaledHeight)
    ctx.arcTo(x, y + scaledHeight, x, y + scaledHeight - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
  } else {
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
  }

  if (rect.is_filled !== false) {
    ctx.fillStyle = color
    ctx.fill()
  }

  if (rect.has_stroke !== false) {
    ctx.strokeStyle = color
    ctx.lineWidth = scaledStrokeWidth
    if (rect.is_stroke_dashed) {
      // Set up dashed line pattern
      ctx.setLineDash([5 * Math.abs(transform.a), 5 * Math.abs(transform.a)])
    }
    ctx.stroke()
    if (rect.is_stroke_dashed) {
      ctx.setLineDash([])
    }
  }

  ctx.restore()
}
