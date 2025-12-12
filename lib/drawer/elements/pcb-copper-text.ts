import type { PcbCopperText } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import { lineAlphabet } from "@tscircuit/alphabet"
import type { PcbColorMap, CanvasContext } from "../types"

export interface DrawPcbCopperTextParams {
  ctx: CanvasContext
  text: PcbCopperText
  transform: Matrix
  colorMap: PcbColorMap
}

const DEFAULT_PADDING = { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 }
const GLYPH_WIDTH_RATIO = 0.62
const LETTER_SPACING_RATIO = 0.16
const SPACE_WIDTH_RATIO = 1
const STROKE_WIDTH_RATIO = 0.13
const CURVED_GLYPHS = new Set(["O", "o", "0"])

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

type AlphabetLayout = {
  width: number
  height: number
  glyphWidth: number
  letterSpacing: number
  spaceWidth: number
  strokeWidth: number
}

function getAlphabetLayout(text: string, fontSize: number): AlphabetLayout {
  const glyphWidth = fontSize * GLYPH_WIDTH_RATIO
  const letterSpacing = glyphWidth * LETTER_SPACING_RATIO
  const spaceWidth = glyphWidth * SPACE_WIDTH_RATIO
  const characters = Array.from(text)

  let width = 0
  characters.forEach((char, index) => {
    const advance = char === " " ? spaceWidth : glyphWidth
    width += advance
    if (index < characters.length - 1) width += letterSpacing
  })

  const strokeWidth = Math.max(fontSize * STROKE_WIDTH_RATIO, 0.35)

  return {
    width,
    height: fontSize,
    glyphWidth,
    letterSpacing,
    spaceWidth,
    strokeWidth,
  }
}

const getGlyphLines = (char: string) =>
  lineAlphabet[char] ?? lineAlphabet[char.toUpperCase()]

function strokeAlphabetText(
  ctx: CanvasContext,
  text: string,
  layout: AlphabetLayout,
  startX: number,
): void {
  const { glyphWidth, letterSpacing, spaceWidth, height, strokeWidth } = layout
  const yOffset = height / 2
  const characters = Array.from(text)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const lines = getGlyphLines(char)
    const advance = char === " " ? spaceWidth : glyphWidth

    if (CURVED_GLYPHS.has(char)) {
      const radiusX = Math.max(glyphWidth / 2 - strokeWidth / 2, strokeWidth)
      const radiusY = Math.max(height / 2 - strokeWidth / 2, strokeWidth)
      const centerY = yOffset - height / 2
      ctx.beginPath()
      ctx.ellipse(
        cursor + glyphWidth / 2,
        centerY,
        radiusX,
        radiusY,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    } else if (lines?.length) {
      ctx.beginPath()
      for (const line of lines) {
        const x1 = cursor + line.x1 * glyphWidth
        const y1 = yOffset - line.y1 * height
        const x2 = cursor + line.x2 * glyphWidth
        const y2 = yOffset - line.y2 * height
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    }

    cursor += advance
    if (index < characters.length - 1) cursor += letterSpacing
  })
}

export function drawPcbCopperText(params: DrawPcbCopperTextParams): void {
  const { ctx, text, transform, colorMap } = params

  const content = text.text ?? ""
  if (!content) return

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
  const layout = getAlphabetLayout(content, fontSize)
  const totalWidth = layout.width + layout.strokeWidth
  const totalHeight = layout.height + layout.strokeWidth
  const alignment = mapAnchorAlignment(text.anchor_alignment)
  const startX =
    alignment === "center"
      ? -totalWidth / 2
      : alignment === "right" || alignment === "end"
        ? -totalWidth
        : 0

  ctx.save()
  ctx.translate(x, y)
  if (text.is_mirrored) ctx.scale(-1, 1)
  if (rotation !== 0) ctx.rotate(-rotation * (Math.PI / 180))

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  if (text.is_knockout) {
    const paddingLeft = padding.left * scale
    const paddingRight = padding.right * scale
    const paddingTop = padding.top * scale
    const paddingBottom = padding.bottom * scale
    const xOffset = startX - paddingLeft
    const yOffset = -(layout.height / 2) - layout.strokeWidth / 2 - paddingTop
    const knockoutWidth = totalWidth + paddingLeft + paddingRight
    const knockoutHeight = totalHeight + paddingTop + paddingBottom

    ctx.fillStyle = textColor
    ctx.fillRect(xOffset, yOffset, knockoutWidth, knockoutHeight)

    const previousCompositeOperation = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.strokeStyle = "rgba(0,0,0,1)"
    strokeAlphabetText(ctx, content, layout, startX)
    if (previousCompositeOperation) {
      ctx.globalCompositeOperation = previousCompositeOperation
    } else {
      ctx.globalCompositeOperation = "source-over"
    }
  } else {
    ctx.strokeStyle = textColor
    strokeAlphabetText(ctx, content, layout, startX)
  }
  ctx.restore()
}
