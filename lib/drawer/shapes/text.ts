import { lineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawLine } from "./line"

export interface DrawTextParams {
  ctx: CanvasContext
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  transform: Matrix
  anchorAlignment?:
    | "center"
    | "top_left"
    | "top_right"
    | "bottom_left"
    | "bottom_right"
  rotation?: number
}

/**
 * Draw text using @tscircuit/alphabet line segments
 * Each character is normalized to fit within a 1x1 unit square
 */
export function drawText(params: DrawTextParams): void {
  const {
    ctx,
    text,
    x,
    y,
    fontSize,
    color,
    transform,
    anchorAlignment = "center",
    rotation = 0,
  } = params

  // Character spacing (slightly more than 1 to add space between characters)
  const charSpacing = 1.1
  const scaledFontSize = fontSize

  // Calculate text width for alignment
  let textWidth = 0
  for (const char of text) {
    if (char === " ") {
      textWidth += charSpacing * 0.5 // Space is half width
    } else if (lineAlphabet[char.toUpperCase() as keyof typeof lineAlphabet]) {
      textWidth += charSpacing
    }
  }

  // Calculate starting x position based on alignment
  let startX = 0
  if (anchorAlignment.includes("left")) {
    startX = 0
  } else if (anchorAlignment.includes("right")) {
    startX = -textWidth * scaledFontSize
  } else {
    // center
    startX = (-textWidth * scaledFontSize) / 2
  }

  // Calculate starting y position based on alignment
  // Characters are centered vertically in their 1x1 square
  let startY = 0
  if (anchorAlignment.includes("top")) {
    startY = scaledFontSize * 0.5
  } else if (anchorAlignment.includes("bottom")) {
    startY = -scaledFontSize * 0.5
  } else {
    // center/middle
    startY = 0
  }

  ctx.save()
  ctx.translate(x, y)

  // Apply rotation (CCW rotation in degrees)
  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  let currentX = startX

  // Draw each character
  for (const char of text) {
    if (char === " ") {
      // Space - just advance position
      currentX += charSpacing * scaledFontSize * 0.5
      continue
    }

    const charUpper = char.toUpperCase() as keyof typeof lineAlphabet
    const charLines = lineAlphabet[charUpper]

    if (!charLines) {
      // Unknown character - skip but advance position
      currentX += charSpacing * scaledFontSize
      continue
    }

    // Draw each line segment of the character
    for (const line of charLines) {
      const { x1, y1, x2, y2 } = line

      // Transform character coordinates (0-1 range) to canvas coordinates
      const charX1 = currentX + x1 * scaledFontSize
      const charY1 = startY + y1 * scaledFontSize
      const charX2 = currentX + x2 * scaledFontSize
      const charY2 = startY + y2 * scaledFontSize

      // Apply the transform matrix to the line endpoints
      const [tx1, ty1] = applyToPoint(transform, [charX1, charY1])
      const [tx2, ty2] = applyToPoint(transform, [charX2, charY2])

      // Draw the line segment directly (no need for beginPath/closePath per segment)
      ctx.beginPath()
      ctx.moveTo(tx1, ty1)
      ctx.lineTo(tx2, ty2)
      ctx.strokeStyle = color
      ctx.lineWidth = Math.abs(transform.a) * scaledFontSize * 0.1 // Stroke width proportional to font size and scale
      ctx.lineCap = "round"
      ctx.stroke()
    }

    // Advance to next character position
    currentX += charSpacing * scaledFontSize
  }

  ctx.restore()
}
