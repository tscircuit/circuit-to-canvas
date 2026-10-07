import { expect, test } from "bun:test"
import { renderViaDarkCenter } from "./pcb-via-dark-center.fixture"

test("center shading uses per-side color overrides", () => {
  const colorOverrides = {
    soldermaskOverHole: { top: "#204060", bottom: "#604020" },
  }
  const top = renderViaDarkCenter("top", true, colorOverrides)
  const bottom = renderViaDarkCenter("bottom", true, colorOverrides)
  expect(top.pixel(-2, 1.5)).toEqual([32, 64, 96, 255])
  expect(bottom.pixel(2, 1.5)).toEqual([96, 64, 32, 255])
  expect(top.pixel(-1.25, 1.5)).toEqual(
    renderViaDarkCenter("top").pixel(-1.25, 1.5),
  )
  expect(bottom.pixel(2.75, 1.5)).toEqual(
    renderViaDarkCenter("bottom").pixel(2.75, 1.5),
  )
})
