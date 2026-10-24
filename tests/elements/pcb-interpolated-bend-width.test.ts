import { expect, test } from "bun:test"
import { pcb_trace } from "circuit-json"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"
import { interpolatedBend } from "../fixtures/interpolated-bend"

test("interpolated bend edges intersect one half-width from each centerline", () => {
  expect(pcb_trace.safeParse(interpolatedBend).success).toBe(true)
  const polygon = buildTracePolygon(interpolatedBend.route)
  // Incoming upper edge is y=-1; outgoing left edge is x=7.
  expect(polygon[1]!.x).toBeCloseTo(7)
  expect(polygon[1]!.y).toBeCloseTo(-1)
  // Incoming lower edge is y=-3; outgoing right edge is x=9.
  expect(polygon[4]!.x).toBeCloseTo(9)
  expect(polygon[4]!.y).toBeCloseTo(-3)
})
