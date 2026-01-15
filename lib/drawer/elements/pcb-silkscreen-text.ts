import type { PcbSilkscreenText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import {
  getAlphabetLayout,
  getTextStartPosition,
  getLineStartX,
  type AnchorAlignment,
} from "../shapes/text"
import { lineAlphabet } from "@tscircuit/alphabet"

export interface DrawPcbSilkscreenTextParams {
  ctx: CanvasContext
  text: PcbSilkscreenText
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToSilkscreenColor(layer: string, colorMap: PcbColorMap): string {
  return layer === "bottom"
    ? colorMap.silkscreen.bottom
    : colorMap.silkscreen.top
}

function mapAnchorAlignment(alignment?: string): AnchorAlignment {
  if (!alignment) return "center"
  return alignment as AnchorAlignment
}

const getGlyphLines = (char: string) =>
  lineAlphabet[char] ?? lineAlphabet[char.toUpperCase()]

function strokeSingleLine(
  ctx: CanvasContext,
  line: string,
  fontSize: number,
  startX: number,
  startY: number,
  layout: ReturnType<typeof getAlphabetLayout>,
): void {
  const { glyphWidth, letterSpacing, spaceWidth, strokeWidth } = layout
  const height = fontSize
  const topY = startY
  const characters = Array.from(line)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const glyphLines = getGlyphLines(char)
    const advance = char === " " ? spaceWidth : glyphWidth

    if (glyphLines?.length) {
      ctx.beginPath()
      for (const glyph of glyphLines) {
        const x1 = cursor + glyph.x1 * glyphWidth
        const y1 = topY + (1 - glyph.y1) * height
        const x2 = cursor + glyph.x2 * glyphWidth
        const y2 = topY + (1 - glyph.y2) * height
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    }

    cursor += advance
    if (index < characters.length - 1) {
      cursor += letterSpacing
    }
  })
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

  const layout = getAlphabetLayout(content, fontSize)
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
  ctx.strokeStyle = color

  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  lines.forEach((line, lineIndex) => {
    const lineStartX =
      startPos.x +
      getLineStartX(alignment, lineWidths[lineIndex]!, width, strokeWidth)
    const lineStartY = startPos.y + lineIndex * lineHeight

    strokeSingleLine(ctx, line, fontSize, lineStartX, lineStartY, layout)
  })

  ctx.restore()
}
