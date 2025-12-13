import { lineAlphabet } from "@tscircuit/alphabet"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../types"

const GLYPH_WIDTH_RATIO = 0.62
const LETTER_SPACING_RATIO = 0.3 // Letter spacing between characters (25% of glyph width)
const SPACE_WIDTH_RATIO = 1
const STROKE_WIDTH_RATIO = 0.13
const CURVED_GLYPHS = new Set(["O", "o", "0"])

// Calculate baseline offset from reference lowercase letters (same as working implementation)
const LOWERCASE_BASELINE_OFFSET = (() => {
  const referenceLetters = ["a", "c", "e", "m", "n", "o", "r", "s", "u", "x"]
  const offsets = referenceLetters
    .map((letter) => lineAlphabet[letter])
    .filter(
      (lines): lines is NonNullable<typeof lines> =>
        lines !== undefined && lines.length > 0,
    )
    .map((lines) =>
      Math.min(...lines.map((line) => Math.min(line.y1, line.y2))),
    )
  return offsets.length > 0 ? Math.min(...offsets) : 0
})()

// Get baseline offset for a specific letter (only lowercase letters get offset)
const getBaselineOffsetForLetter = (letter: string) =>
  letter >= "a" && letter <= "z" ? LOWERCASE_BASELINE_OFFSET : 0

export type AlphabetLayout = {
  width: number
  height: number
  glyphWidth: number
  letterSpacing: number
  spaceWidth: number
  strokeWidth: number
  baselineOffset: number // Distance from top to baseline
  descenderDepth: number // Distance from baseline to bottom (for descenders)
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
  // Calculate baseline offset: only apply if text contains lowercase letters
  // In normalized coords: y=0 is bottom, y=1 is top
  // LOWERCASE_BASELINE_OFFSET is the minimum y (where baseline is) in normalized coords
  // The baseline is at the bottom of lowercase letters (y ≈ 0)
  // baselineOffset should be the distance from TOP to baseline
  // If baseline is at y=0 (bottom), then distance from top (y=1) to baseline = 1 - 0 = 1
  // So baselineOffset = (1 - LOWERCASE_BASELINE_OFFSET) * fontSize
  // This gives us the distance from the top of the text box to the baseline
  const hasLowercase = /[a-z]/.test(text)
  const baselineOffset = hasLowercase
    ? (1 - LOWERCASE_BASELINE_OFFSET) * fontSize
    : fontSize
  // Descender depth: distance from baseline DOWN to bottom (for descenders like g, j, p, q, y)
  // Since baseline is at the bottom of the letter box, descenderDepth is the space below baseline
  // For uppercase: baselineOffset=fontSize (baseline at top), descenderDepth=0
  // For lowercase: baselineOffset < fontSize, descenderDepth = fontSize - baselineOffset
  // Actually, wait - if baseline is at bottom, descenderDepth should be 0 for most letters
  // But for letters with descenders, they extend below the baseline
  // For now: descenderDepth = LOWERCASE_BASELINE_OFFSET * fontSize (space below baseline)
  const descenderDepth = hasLowercase ? LOWERCASE_BASELINE_OFFSET * fontSize : 0

  return {
    width,
    height: fontSize,
    glyphWidth,
    letterSpacing,
    spaceWidth,
    strokeWidth,
    baselineOffset,
    descenderDepth,
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
  // Total height includes descender depth for proper vertical alignment
  const totalHeight = layout.height + layout.descenderDepth + layout.strokeWidth

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

  // Vertical alignment - positions relative to baseline
  // Text extends from (baseline - baselineOffset) at top to (baseline + descenderDepth) at bottom
  // Total height = baselineOffset + descenderDepth = height
  // baselineOffset = distance from top to baseline
  // descenderDepth = distance from baseline to bottom
  if (alignment === "center") {
    // Center the text box: baseline should be positioned so the text box is centered
    // Top of text box is at: baseline - baselineOffset
    // Bottom of text box is at: baseline + descenderDepth
    // Center is at: baseline - baselineOffset + (baselineOffset + descenderDepth) / 2
    // = baseline - baselineOffset + height / 2
    // For center alignment, we want center at y=0, so:
    // 0 = baseline - baselineOffset + height / 2
    // baseline = baselineOffset - height / 2
    y = layout.baselineOffset - layout.height / 2
  } else if (
    alignment === "top_left" ||
    alignment === "top_right" ||
    alignment === "top"
  ) {
    // Top alignment: position baseline so top of text is at anchor (y=0)
    // Top is at baseline - baselineOffset, so baseline = anchor + baselineOffset
    y = layout.baselineOffset
  } else if (
    alignment === "bottom_left" ||
    alignment === "bottom_right" ||
    alignment === "bottom"
  ) {
    // Bottom alignment: position baseline so bottom of text is at anchor (y=0)
    // Bottom is at baseline + descenderDepth, so baseline = anchor - descenderDepth
    y = -layout.descenderDepth
  } else {
    // Default (left/right): baseline at y=0
    y = 0
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
  const {
    glyphWidth,
    letterSpacing,
    spaceWidth,
    height,
    strokeWidth,
    baselineOffset,
  } = layout
  // startY is now the baseline position, so we position glyphs relative to baseline
  const baselineY = startY
  const characters = Array.from(text)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const lines = getGlyphLines(char)
    const advance = char === " " ? spaceWidth : glyphWidth
    // Get normalized baseline offset for this specific character (0-1 range)
    const charBaselineOffset = getBaselineOffsetForLetter(char)

    if (CURVED_GLYPHS.has(char)) {
      // For curved glyphs, adjust coordinates by baseline offset
      // Center is at y=0.5 in normalized coords
      // Adjusted center: 0.5 - charBaselineOffset
      // Transform: baselineY - (0.5 - charBaselineOffset) * height (inverted for canvas)
      const normalizedCenterY = 0.5
      const adjustedCenterY = normalizedCenterY - charBaselineOffset
      const centerY = baselineY - adjustedCenterY * height
      const radiusX = Math.max(glyphWidth / 2 - strokeWidth / 2, strokeWidth)
      const radiusY = Math.max(height / 2 - strokeWidth / 2, strokeWidth)
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
        // Convert normalized y coordinates to canvas coordinates
        // In alphabet coords: y=0 is bottom, y increases upward
        // In canvas coords: y increases downward, so we need to invert
        // Following the working implementation:
        // 1. Adjust by baseline offset: adjusted_y = norm_y - charBaselineOffset
        // 2. Transform: y = baselineY - adjusted_y * height (inverted for canvas)
        const adjusted_y1 = line.y1 - charBaselineOffset
        const adjusted_y2 = line.y2 - charBaselineOffset
        const x1 = cursor + line.x1 * glyphWidth
        const y1 = baselineY - adjusted_y1 * height
        const x2 = cursor + line.x2 * glyphWidth
        const y2 = baselineY - adjusted_y2 * height
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    }

    // Move cursor by the character width
    cursor += advance
    // Add letter spacing after each character except the last one
    // This spacing will be before the next character, creating visible gaps
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
