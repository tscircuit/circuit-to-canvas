import type { PcbSoldermaskOpening } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext } from "../types"
import { drawCircle } from "../shapes/circle"
import { drawRect } from "../shapes/rect"
import { drawPolygon } from "../shapes/polygon"

/** Draw an aperture in resolved PCB coordinates (+X right, +Y up), in mm. */
export function drawSoldermaskOpening({
  ctx,
  opening,
  realToCanvasMat,
  fill,
}: {
  ctx: CanvasContext
  opening: PcbSoldermaskOpening
  realToCanvasMat: Matrix
  fill: string
}) {
  if (opening.shape === "polygon") {
    drawPolygon({ ctx, points: opening.points, fill, realToCanvasMat })
    return
  }
  const center = { x: opening.x, y: opening.y }
  if (opening.shape === "circle") {
    drawCircle({ ctx, center, radius: opening.radius, fill, realToCanvasMat })
    return
  }
  let ccwRotationDegrees = 0
  if (opening.shape === "rotated_rect") {
    ccwRotationDegrees = opening.ccw_rotation
  }
  drawRect({
    ctx,
    center,
    width: opening.width,
    height: opening.height,
    ccwRotationDegrees,
    fill,
    realToCanvasMat,
  })
}
