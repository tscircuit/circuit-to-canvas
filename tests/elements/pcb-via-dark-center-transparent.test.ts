import { expect, test } from "bun:test"
import { renderViaDarkCenter } from "./pcb-via-dark-center.fixture"

test("transparent mask colors do not add a dark center", () => {
  const view = renderViaDarkCenter("top", true, {
    soldermaskOverCopper: { top: "transparent", bottom: "transparent" },
    soldermaskOverHole: { top: "transparent", bottom: "transparent" },
  })
  const copper = renderViaDarkCenter("top", false)
  const boardMask = view.pixel(0, 0)
  expect(view.pixel(-2, 1.5)).toEqual(boardMask)
  expect(view.pixel(-2, -1.5)).toEqual(copper.pixel(-2, -1.5))
})
