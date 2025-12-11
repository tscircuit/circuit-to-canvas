import type { PcbCopperText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"

export interface DrawPcbCopperTextParams {
  ctx: CanvasContext
  text: PcbCopperText
  transform: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_PADDING = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 }

function layerToCopperColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

function mapAnchorAlignment(
  alignment?: string,
): "start" | "end" | "left" | "right" | "center" {
  if (!alignment) return "center"
  if (alignment.includes("left")) return "left"
  if (alignment.includes("right")) return "right"
  return "center"
}

export function drawPcbCopperText(params: DrawPcbCopperTextParams): void {
  const { ctx, text, transform, colorMap } = params

  const [x, y] = applyToPoint(transform, [
    text.anchor_position.x,
    text.anchor_position.y,
  ])
  const scale = Math.abs(transform.a)
  const fontSize = (text.font_size ?? 1) * scale
  const rotation = text.ccw_rotation ?? 0
  const padding = {
    ...DEFAULT_PADDING,
    ...text.knockout_padding,
  }
  const textColor = layerToCopperColor(text.layer, colorMap)

  ctx.save()
  ctx.translate(x, y)
  if (text.is_mirrored) ctx.scale(-1, 1)
  if (rotation !== 0) ctx.rotate(-rotation * (Math.PI / 180))

  ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = mapAnchorAlignment(text.anchor_alignment)
  ctx.textBaseline = "middle"

  if (text.is_knockout) {
    const measure = ctx.measureText?.(text.text)
    const textWidth = measure?.width ?? text.text.length * (fontSize * 0.6)
    const ascent = measure?.actualBoundingBoxAscent ?? fontSize * 0.8
    const descent = measure?.actualBoundingBoxDescent ?? fontSize * 0.2
    const textHeight = ascent + descent
    const xOffset =
      ctx.textAlign === "center"
        ? -textWidth / 2
        : ctx.textAlign === "right" || ctx.textAlign === "end"
          ? -textWidth
          : 0

    ctx.fillStyle = textColor
    ctx.fillRect(
      xOffset - padding.left * scale,
      -ascent - padding.top * scale,
      textWidth + (padding.left + padding.right) * scale,
      textHeight + (padding.top + padding.bottom) * scale,
    )

    const previousCompositeOperation = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.fillText(text.text, 0, 0)
    if (previousCompositeOperation) {
      ctx.globalCompositeOperation = previousCompositeOperation
    } else {
      ctx.globalCompositeOperation = "source-over"
    }
  } else {
    ctx.fillStyle = textColor
    ctx.fillText(text.text, 0, 0)
  }
  ctx.restore()
}
