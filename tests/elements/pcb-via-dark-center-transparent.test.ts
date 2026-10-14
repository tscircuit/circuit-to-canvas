import { expect, test } from "bun:test"
import { renderViaDarkCenter } from "./pcb-via-dark-center.fixture"

test("transparent via overlays leave only the translucent board mask", () => {
  const view = renderViaDarkCenter("top", true, {
    soldermaskOverCopper: { top: "transparent", bottom: "transparent" },
    soldermaskOverHole: { top: "transparent", bottom: "transparent" },
  })
  const copper = renderViaDarkCenter("top", false)
  const boardMask = view.pixel(0, 0)
  const drill = copper.pixel(-2, 1.5)
  const alpha = boardMask[3]! / 255
  const actual = view.pixel(-2, 1.5)
  // With SVG's 80% board mask, the underlying drill remains visible.
  for (let channel = 0; channel < 3; channel++) {
    const blended = Math.round(
      boardMask[channel]! * alpha + drill[channel]! * (1 - alpha),
    )
    expect(Math.abs(actual[channel]! - blended)).toBeLessThanOrEqual(1)
  }
  expect(actual[3]).toBe(255)
  expect(view.pixel(-2, -1.5)).toEqual(copper.pixel(-2, -1.5))
})
