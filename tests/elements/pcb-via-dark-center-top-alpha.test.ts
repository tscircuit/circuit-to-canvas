import { expect, test } from "bun:test"
import { renderTranslucentVia } from "./pcb-via-dark-center.fixture"

test("top semi-transparent tenting preserves center alpha", () => {
  const { center, ring } = renderTranslucentVia("top")
  expect(center[3]).toBe(ring[3])
  expect(Math.abs(center[3]! - 127.5)).toBeLessThanOrEqual(0.5)
  for (let channel = 0; channel < 3; channel++) {
    expect(Math.abs(center[channel]! - ring[channel]! / 2)).toBeLessThanOrEqual(
      1,
    )
  }
})
