export const GLYPH_WIDTH_RATIO = 0.62
export const LETTER_SPACING_RATIO = 0.3 // Letter spacing between characters (25% of glyph width)
export const SPACE_WIDTH_RATIO = 1
export const STROKE_WIDTH_RATIO = 0.13

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
