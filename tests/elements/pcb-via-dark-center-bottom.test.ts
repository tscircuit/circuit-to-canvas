import { expect, test } from "bun:test"
import { circuit, renderViaDarkCenter } from "./pcb-via-dark-center.fixture"

test("bottom view darkens only tented via centers", async () => {
  const original = structuredClone(circuit)
  const view = renderViaDarkCenter("bottom")
  const copper = renderViaDarkCenter("bottom", false)

  // Explicit per-side overrides take precedence over the owning board.
  expect(view.pixel(2, 1.5)).not.toEqual(view.pixel(2.75, 1.5))
  expect(view.pixel(-2, 1.5)).toEqual(copper.pixel(-2, 1.5))

  // Route-only vias use the same per-side tenting appearance.
  expect(view.pixel(-2, -1.5)).toEqual(view.pixel(2, 1.5))

  // The exposed pad clips both the annular mask and the center shading.
  expect(view.pixel(1.75, -1.5)).toEqual(copper.pixel(1.75, -1.5))
  expect(view.pixel(2.25, -1.5)).toEqual(view.pixel(2, 1.5))
  expect(view.pixel(2.75, -1.5)).toEqual(view.pixel(2.75, 1.5))
  expect(copper.pixel(-2, 1.5)).toEqual(copper.pixel(2, 1.5))
  expect(circuit).toEqual(original)
  await expect(view.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "via-dark-center-bottom",
  )
})
