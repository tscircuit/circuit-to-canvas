import { expect, test } from "bun:test"
import { pcb_trace } from "circuit-json"
import { buildTracePolygon } from "../../lib/drawer/elements/pcb-trace/build-trace-polygon"
import { interpolatedBend } from "../fixtures/interpolated-bend"

test("interpolated bends intersect inside edges and bevel outside edges at the specified half-width", () => {
  expect(pcb_trace.safeParse(interpolatedBend).success).toBe(true)
  const polygon = buildTracePolygon(interpolatedBend.route)
  // Incoming upper edge is y=-1; outgoing left edge is x=7.
  expect(polygon[1]!.x).toBeCloseTo(7)
  expect(polygon[1]!.y).toBeCloseTo(-1)
  // The outside bevel connects the outgoing right and incoming lower edges.
  expect(polygon).toHaveLength(7)
  expect(polygon[4]).toEqual({ x: 9, y: -2 })
  expect(polygon[5]).toEqual({ x: 8, y: -3 })
})
