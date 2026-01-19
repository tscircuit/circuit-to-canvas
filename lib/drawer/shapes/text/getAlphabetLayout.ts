export const GLYPH_WIDTH_RATIO = 0.62
export const LETTER_SPACING_RATIO = 0.3 // Letter spacing between characters (25% of glyph width)
export const SPACE_WIDTH_RATIO = 1
export const STROKE_WIDTH_RATIO = 0.13
export const LINE_HEIGHT_RATIO = 1.2 // Line height as a ratio of font size

export type AlphabetLayout = {
  width: number
  height: number
  glyphWidth: number
  letterSpacing: number
  spaceWidth: number
  strokeWidth: number
  lineHeight: number
  lines: string[]
  lineWidths: number[]
}

export function getAlphabetLayout(
  text: string,
  fontSize: number,
): AlphabetLayout {
  const glyphWidth = fontSize * GLYPH_WIDTH_RATIO
  const letterSpacing = glyphWidth * LETTER_SPACING_RATIO
  const spaceWidth = glyphWidth * SPACE_WIDTH_RATIO
  const strokeWidth = Math.max(fontSize * STROKE_WIDTH_RATIO, 0.35)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO

  const lines = text.split("\n")
  const lineWidths: number[] = []

  let maxWidth = 0
  for (const line of lines) {
    const characters = Array.from(line)
    let lineWidth = 0
    characters.forEach((char, index) => {
      const advance = char === " " ? spaceWidth : glyphWidth
      lineWidth += advance
      if (index < characters.length - 1) lineWidth += letterSpacing
    })
    lineWidths.push(lineWidth)
    if (lineWidth > maxWidth) maxWidth = lineWidth
  }

  const totalHeight =
    lines.length > 1 ? fontSize + (lines.length - 1) * lineHeight : fontSize

  return {
    width: maxWidth,
    height: totalHeight,
    glyphWidth,
    letterSpacing,
    spaceWidth,
    strokeWidth,
    lineHeight,
    lines,
    lineWidths,
  }
}
