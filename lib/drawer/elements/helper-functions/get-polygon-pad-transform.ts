import type { PcbHoleWithPolygonPad } from "circuit-json"
import { compose, rotate, translate } from "transformation-matrix"

export function getPolygonPadTransform(hole: PcbHoleWithPolygonPad) {
  return compose(
    translate(hole.x, hole.y),
    rotate(((hole.ccw_rotation ?? 0) * Math.PI) / 180),
  )
}
