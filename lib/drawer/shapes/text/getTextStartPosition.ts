import type { NinePointAnchor } from "circuit-json"
import type { AlphabetLayout } from "./getAlphabetLayout"

export type AnchorAlignment = NinePointAnchor

export function getTextStartPosition(
  alignment: NinePointAnchor,
  layout: AlphabetLayout,
): { x: number; y: number } {
  const totalWidth = layout.width + layout.strokeWidth
  const totalHeight = layout.height + layout.strokeWidth

  let x = 0
  let y = 0

  // Horizontal alignment
  if (
    alignment === "center" ||
    alignment === "top_center" ||
    alignment === "bottom_center"
  ) {
    x = -totalWidth / 2
  } else if (
    alignment === "top_left" ||
    alignment === "bottom_left" ||
    alignment === "center_left"
  ) {
    x = 0
  } else if (
    alignment === "top_right" ||
    alignment === "bottom_right" ||
    alignment === "center_right"
  ) {
    x = -totalWidth
  }

  // Vertical alignment
  if (
    alignment === "center" ||
    alignment === "center_left" ||
    alignment === "center_right"
  ) {
    y = -totalHeight / 2
  } else if (
    alignment === "top_left" ||
    alignment === "top_right" ||
    alignment === "top_center"
  ) {
    y = 0
  } else if (
    alignment === "bottom_left" ||
    alignment === "bottom_right" ||
    alignment === "bottom_center"
  ) {
    y = -totalHeight
  }

  return { x, y }
}
