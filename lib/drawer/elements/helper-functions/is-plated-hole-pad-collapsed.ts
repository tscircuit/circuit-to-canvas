import type { PcbPlatedHole } from "circuit-json"

/** Whether a margin closes either dimension of a non-polygon plated pad. */
export function isPlatedHolePadCollapsed(
  hole: PcbPlatedHole,
  margin: number,
): boolean {
  if (hole.shape === "circle") {
    return hole.outer_diameter + margin * 2 <= 0
  }
  if (hole.shape === "oval" || hole.shape === "pill") {
    return Math.min(hole.outer_width, hole.outer_height) + margin * 2 <= 0
  }
  if ("rect_pad_width" in hole) {
    return Math.min(hole.rect_pad_width, hole.rect_pad_height) + margin * 2 <= 0
  }
  return false
}
