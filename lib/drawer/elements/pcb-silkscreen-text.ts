import type { PcbSilkscreenText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import {
  getAlphabetLayout,
  getTextStartPosition,
  getLineStartX,
  strokeAlphabetLine,
  type AnchorAlignment,
} from "../shapes/text"

export interface DrawPcbSilkscreenTextParams {
  ctx: CanvasContext
  text: PcbSilkscreenText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_PADDING = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 }

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

function mapAnchorAlignment(alignment?: string): AnchorAlignment {
  if (!alignment) return "center"
  return alignment as AnchorAlignment
}

export function drawPcbSilkscreenText(
  params: DrawPcbSilkscreenTextParams,
): void {
  const { ctx, text, realToCanvasMat, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

  const color = layerToSilkscreenColor(text.layer, colorMap)
  const [x, y] = applyToPoint(realToCanvasMat, [
    text.anchor_position.x,
    text.anchor_position.y,
  ])
  const scale = Math.abs(realToCanvasMat.a)
  const fontSize = (text.font_size ?? 1) * scale
  const rotation = text.ccw_rotation ?? 0
  const padding = {
    ...DEFAULT_PADDING,
    ...text.knockout_padding,
  }

  const layout = getAlphabetLayout(content, fontSize)
  const totalWidth = layout.width + layout.strokeWidth
  const alignment = mapAnchorAlignment(text.anchor_alignment)
  const startPos = getTextStartPosition(alignment, layout)

  ctx.save()
  ctx.translate(x, y)

  // Apply rotation (CCW rotation in degrees)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  if (text.layer === "bottom") {
    ctx.scale(-1, 1)
  }

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  if (text.is_knockout) {
    const paddingLeft = padding.left * scale
    const paddingRight = padding.right * scale
    const paddingTop = padding.top * scale
    const paddingBottom = padding.bottom * scale
    const rectX = startPos.x - paddingLeft * 4
    const rectY = startPos.y - paddingTop * 4
    const rectWidth = totalWidth + paddingLeft * 2 + paddingRight * 2
    const rectHeight =
      layout.height + layout.strokeWidth + paddingTop * 2 + paddingBottom * 2

    ctx.fillStyle = color
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight)
  } else {
    ctx.strokeStyle = color
  }

  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  lines.forEach((line, lineIndex) => {
    const lineStartX =
      startPos.x +
      getLineStartX({
        alignment,
        lineWidth: lineWidths[lineIndex]!,
        maxWidth: width,
        strokeWidth,
      })
    const lineStartY = startPos.y + lineIndex * lineHeight

    strokeAlphabetLine({
      ctx,
      line,
      fontSize,
      startX: lineStartX,
      startY: lineStartY,
      layout,
    })
  })

  ctx.restore()
}
