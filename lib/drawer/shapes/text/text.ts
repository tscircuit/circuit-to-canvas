import { glyphLineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import type { NinePointAnchor, Point } from "circuit-json"
import { addPolygonToPath } from "./addPolygonToPath"
import {
  getAlphabetAdvanceWidth,
  getAlphabetLayout,
  type AlphabetLayout,
} from "./getAlphabetLayout"
import { getAlphabetOutlineGroups } from "./getAlphabetOutlineGroups"
import { getPolygonBounds } from "./getPolygonBounds"
import { getTextStartPosition, getLineStartX } from "./getTextStartPosition"

const getGlyphLines = (char: string) => glyphLineAlphabet[char]

export interface StrokeAlphabetTextParams {
  ctx: CanvasContext
  text: string
  fontSize: number
  startX: number
  startY: number
  anchorAlignment?: NinePointAnchor
}

export interface StrokeAlphabetLineParams {
  ctx: CanvasContext
  line: string
  fontSize: number
  startX: number
  startY: number
  layout: AlphabetLayout
}

export function strokeAlphabetLine(params: StrokeAlphabetLineParams): void {
  const { ctx, line, fontSize, startX, startY, layout } = params
  const { strokeWidth } = layout
  const height = fontSize
  const glyphScaleX = fontSize
  const topY = startY
  const characters = Array.from(line)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const glyphLines = getGlyphLines(char)

    if (glyphLines?.length) {
      ctx.beginPath()
      for (const glyph of glyphLines) {
        const x1 = cursor + glyph.x1 * glyphScaleX
        const y1 = topY + (1 - glyph.y1) * height
        const x2 = cursor + glyph.x2 * glyphScaleX
        const y2 = topY + (1 - glyph.y2) * height
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    }

    cursor += getAlphabetAdvanceWidth(char, characters[index + 1], fontSize)
  })
}

export function strokeAlphabetText(params: StrokeAlphabetTextParams): void {
  const {
    ctx,
    text,
    fontSize,
    startX,
    startY,
    anchorAlignment = "center",
  } = params
  const layout = getAlphabetLayout(text, fontSize)
  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  lines.forEach((line, lineIndex) => {
    const lineStartX =
      startX +
      getLineStartX({
        alignment: anchorAlignment,
        lineWidth: lineWidths[lineIndex]!,
        maxWidth: width,
        strokeWidth,
      })
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

const DEFAULT_KNOCKOUT_PADDING = {
  left: 0.2,
  right: 0.2,
  top: 0.2,
  bottom: 0.2,
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
  mirrorX?: boolean
  knockout?: boolean
  knockoutPadding?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
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
    mirrorX = false,
    knockout = false,
    knockoutPadding = {},
  } = params

  if (!text) return

  const [canvasX, canvasY] = applyToPoint(realToCanvasMat, [x, y])
  const scale = Math.abs(realToCanvasMat.a)
  const scaledFontSize = fontSize * scale
  const layout = getAlphabetLayout(text, scaledFontSize)
  const startPos = getTextStartPosition(anchorAlignment, layout)
  const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

  ctx.save()
  ctx.translate(canvasX, canvasY)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  // Apply mirroring if needed (e.g. for bottom layer)
  if (mirrorX) {
    ctx.scale(-1, 1)
  }

  // Handle Knockout Background
  if (knockout) {
    const padding = { ...DEFAULT_KNOCKOUT_PADDING, ...knockoutPadding }
    const paddingLeft = padding.left * scale
    const paddingRight = padding.right * scale
    const paddingTop = padding.top * scale
    const paddingBottom = padding.bottom * scale
    const glyphPolygons: Point[][] = []
    const glyphGroups: Point[][][] = []

    for (const [lineIndex, line] of lines.entries()) {
      const lineStartX =
        startPos.x +
        getLineStartX({
          alignment: anchorAlignment,
          lineWidth: lineWidths[lineIndex]!,
          maxWidth: width,
          strokeWidth,
        })
      const lineStartY = startPos.y + lineIndex * lineHeight
      const groups = getAlphabetOutlineGroups({
        line,
        fontSize: scaledFontSize,
        startX: lineStartX,
        startY: lineStartY,
        layout,
      })
      glyphGroups.push(...groups)
      for (const group of groups) glyphPolygons.push(...group)
    }

    const bounds = getPolygonBounds(glyphPolygons)
    if (!bounds) {
      ctx.restore()
      return
    }

    const rectX = bounds.minX - paddingLeft
    const rectY = bounds.minY - paddingTop
    const rectWidth = bounds.maxX - bounds.minX + paddingLeft + paddingRight
    const rectHeight = bounds.maxY - bounds.minY + paddingTop + paddingBottom

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.rect(rectX, rectY, rectWidth, rectHeight)
    for (const group of glyphGroups) {
      for (const polygon of group) {
        addPolygonToPath(ctx, polygon)
      }
    }
    ctx.fill("evenodd")
  } else {
    // Only set strokeStyle if NOT knockout, matching existing behavior
    ctx.strokeStyle = color
  }

  ctx.lineWidth = layout.strokeWidth
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  if (!knockout) {
    lines.forEach((line, lineIndex) => {
      const lineStartX =
        startPos.x +
        getLineStartX({
          alignment: anchorAlignment,
          lineWidth: lineWidths[lineIndex]!,
          maxWidth: width,
          strokeWidth,
        })
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
  }

  ctx.restore()
}
