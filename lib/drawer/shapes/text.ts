import { lineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

const GLYPH_WIDTH_RATIO = 0.62
const LETTER_SPACING_RATIO = 0.3 // Letter spacing between characters (25% of glyph width)
const SPACE_WIDTH_RATIO = 1
const STROKE_WIDTH_RATIO = 0.13
const BASELINE_Y = -0.241 // Baseline adjustment for lowercase letters to align with uppercase/numbers

export type AlphabetLayout = {
  width: number
  height: number
  glyphWidth: number
  letterSpacing: number
  spaceWidth: number
  strokeWidth: number
}

export function getAlphabetLayout(
  text: string,
  fontSize: number,
): AlphabetLayout {
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

export type AnchorAlignment =
  | "center"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "left"
  | "right"
  | "top"
  | "bottom"

export function getTextStartPosition(
  alignment: AnchorAlignment,
  layout: AlphabetLayout,
): { x: number; y: number } {
  const totalWidth = layout.width + layout.strokeWidth
  const totalHeight = layout.height + layout.strokeWidth

  let x = 0
  let y = 0

  // Horizontal alignment
  if (alignment === "center") {
    x = -totalWidth / 2
  } else if (
    alignment === "top_left" ||
    alignment === "bottom_left" ||
    alignment === "left"
  ) {
    x = 0
  } else if (
    alignment === "top_right" ||
    alignment === "bottom_right" ||
    alignment === "right"
  ) {
    x = -totalWidth
  }

  // Vertical alignment - using middle baseline like silkscreen text
  // The anchor point is at the vertical center of the text (y=0 means center at anchor)
  if (alignment === "center") {
    y = 0 // Center at anchor point
  } else if (
    alignment === "top_left" ||
    alignment === "top_right" ||
    alignment === "top"
  ) {
    y = totalHeight / 2 // Move down so top aligns with anchor
  } else if (
    alignment === "bottom_left" ||
    alignment === "bottom_right" ||
    alignment === "bottom"
  ) {
    y = -totalHeight / 2 // Move up so bottom aligns with anchor
  } else {
    y = 0 // Default: center at anchor point
  }

  return { x, y }
}

export function strokeAlphabetText(
  ctx: CanvasContext,
  text: string,
  layout: AlphabetLayout,
  startX: number,
  startY: number,
): void {
  const { glyphWidth, letterSpacing, spaceWidth, height, strokeWidth } = layout
  const centerY = startY
  const baselineY = startY + height / 2
  const characters = Array.from(text)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const lines = getGlyphLines(char)
    const advance = char === " " ? spaceWidth : glyphWidth
    const isLowercase = char >= "a" && char <= "z"
    const baselineAdjust = isLowercase ? BASELINE_Y : 0

    if (lines?.length) {
      ctx.beginPath()
      for (const line of lines) {
        const x1 = cursor + line.x1 * glyphWidth
        const y1 = baselineY - line.y1 * height - baselineAdjust * height
        const x2 = cursor + line.x2 * glyphWidth
        const y2 = baselineY - line.y2 * height - baselineAdjust * height
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

export interface DrawTextParams {
  ctx: CanvasContext
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  transform: Matrix
  anchorAlignment: AnchorAlignment
  rotation?: number
}

export function drawText(params: DrawTextParams): void {
  const {
    ctx,
    text,
    x,
    y,
    fontSize,
    color,
    transform,
    anchorAlignment,
    rotation = 0,
  } = params

  if (!text) return

  const [transformedX, transformedY] = applyToPoint(transform, [x, y])
  const scale = Math.abs(transform.a)
  const scaledFontSize = fontSize * scale
  const layout = getAlphabetLayout(text, scaledFontSize)
  const startPos = getTextStartPosition(anchorAlignment, layout)

  ctx.save()
  ctx.translate(transformedX, transformedY)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color

  strokeAlphabetText(ctx, text, layout, startPos.x, startPos.y)

  ctx.restore()
}
