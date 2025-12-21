import { lineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import type { NinePointAnchor } from "circuit-json"
import { getAlphabetLayout, type AlphabetLayout } from "./getAlphabetLayout"
import { getTextStartPosition } from "./getTextStartPosition"

const getGlyphLines = (char: string) =>
  lineAlphabet[char] ?? lineAlphabet[char.toUpperCase()]

export interface StrokeAlphabetTextParams {
  ctx: CanvasContext
  text: string
  fontSize: number
  startX: number
  startY: number
}

export function strokeAlphabetText(params: StrokeAlphabetTextParams): void {
  const { ctx, text, fontSize, startX, startY } = params
  const layout = getAlphabetLayout(text, fontSize)
  const { glyphWidth, letterSpacing, spaceWidth, height, strokeWidth } = layout
  const topY = startY
  const characters = Array.from(text)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const lines = getGlyphLines(char)
    const advance = char === " " ? spaceWidth : glyphWidth

    if (lines?.length) {
      ctx.beginPath()
      for (const line of lines) {
        // Convert normalized y coordinates to canvas coordinates (inverted for canvas)
        // In normalized coords: y=0 is bottom, y=1 is top
        const x1 = cursor + line.x1 * glyphWidth
        const y1 = topY + (1 - line.y1) * height
        const x2 = cursor + line.x2 * glyphWidth
        const y2 = topY + (1 - line.y2) * height
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

  strokeAlphabetText({
    ctx,
    text,
    fontSize: scaledFontSize,
    startX: startPos.x,
    startY: startPos.y,
  })

  ctx.restore()
}
