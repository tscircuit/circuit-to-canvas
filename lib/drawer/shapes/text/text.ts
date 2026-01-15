import { lineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import type { NinePointAnchor } from "circuit-json"
import { getAlphabetLayout, type AlphabetLayout } from "./getAlphabetLayout"
import { getTextStartPosition, getLineStartX } from "./getTextStartPosition"

const getGlyphLines = (char: string) =>
  lineAlphabet[char] ?? lineAlphabet[char.toUpperCase()]

export interface StrokeAlphabetTextParams {
  ctx: CanvasContext
  text: string
  fontSize: number
  startX: number
  startY: number
}

export interface StrokeAlphabetLineParams {
  ctx: CanvasContext
  line: string
  fontSize: number
  startX: number
  startY: number
  layout: AlphabetLayout
}

function strokeAlphabetLine(params: StrokeAlphabetLineParams): void {
  const { ctx, line, fontSize, startX, startY, layout } = params
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

export function strokeAlphabetText(params: StrokeAlphabetTextParams): void {
  const { ctx, text, fontSize, startX, startY } = params
  const layout = getAlphabetLayout(text, fontSize)
  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  lines.forEach((line, lineIndex) => {
    const lineStartX =
      startX +
      getLineStartX("center", lineWidths[lineIndex], width, strokeWidth)
    const lineStartY = startY + lineIndex * lineHeight

    strokeAlphabetLine({
      ctx,
      line,
      fontSize,
      startX: lineStartX,
      startY: lineStartY,
      layout,
    })
  })
}

export interface DrawTextParams {
  ctx: CanvasContext
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  realToCanvasMat: Matrix
  anchorAlignment: NinePointAnchor
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
    realToCanvasMat,
    anchorAlignment,
    rotation = 0,
  } = params

  if (!text) return

  const [canvasX, canvasY] = applyToPoint(realToCanvasMat, [x, y])
  const scale = Math.abs(realToCanvasMat.a)
  const scaledFontSize = fontSize * scale
  const layout = getAlphabetLayout(text, scaledFontSize)
  const startPos = getTextStartPosition(anchorAlignment, layout)

  ctx.save()
  ctx.translate(canvasX, canvasY)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color

  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  lines.forEach((line, lineIndex) => {
    const lineStartX =
      startPos.x +
      getLineStartX(anchorAlignment, lineWidths[lineIndex], width, strokeWidth)
    const lineStartY = startPos.y + lineIndex * lineHeight

    strokeAlphabetLine({
      ctx,
      line,
      fontSize: scaledFontSize,
      startX: lineStartX,
      startY: lineStartY,
      layout,
    })
  })

  ctx.restore()
}
