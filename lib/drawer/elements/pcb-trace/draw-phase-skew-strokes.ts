import type { Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import { mergeDrawingLayer } from "../../layers/merge-drawing-layer"
import type { DrawLineParams } from "../../shapes/line"
import { addPolygonToPath } from "../../shapes/text/addPolygonToPath"
import type { CanvasContext } from "../../types"
import type {
  PhaseSkewStroke,
  PhaseSkewStrokesByLayer,
} from "./get-drawable-phase-skew-strokes"

/** The overlay is wider than the copper so its color covers the trace edges. */
const OVERLAY_WIDTH_FACTOR = 1.1
const MAX_MITER_RATIO = 2
const ANTIALIAS_PADDING_PX = 1

type CanvasStroke = Pick<
  PhaseSkewStroke,
  "start" | "end" | "startColor" | "endColor"
> & {
  normal: Point
  length: number
  radius: number
}

/** Draws the joined phase-skew runs over one layer's copper. */
export function drawPhaseSkewStrokes({
  ctx,
  strokes,
  realToCanvasMat,
}: Pick<DrawLineParams, "ctx" | "realToCanvasMat"> & {
  strokes: ReturnType<PhaseSkewStrokesByLayer["get"]>
}): void {
  if (strokes === undefined || strokes.length === 0) return

  const pixelsPerMm = Math.hypot(realToCanvasMat.a, realToCanvasMat.b)
  ctx.save()
  for (const run of strokes) {
    const canvasStrokes: CanvasStroke[] = []
    for (const stroke of run) {
      // Use one position for both sides of each joint.
      const previous = canvasStrokes.at(-1)
      const start =
        previous === undefined
          ? applyToPoint(realToCanvasMat, stroke.start)
          : previous.end
      const end = applyToPoint(realToCanvasMat, stroke.end)
      const dx = end.x - start.x
      const dy = end.y - start.y
      const length = Math.hypot(dx, dy)
      if (length === 0) continue
      canvasStrokes.push({
        start,
        end,
        normal: { x: -dy / length, y: dx / length },
        length,
        radius: (stroke.width * OVERLAY_WIDTH_FACTOR * pixelsPerMm) / 2,
        startColor: stroke.startColor,
        endColor: stroke.endColor,
      })
    }

    if (!canvasStrokes.length) continue
    if (!drawRunOnLayer(ctx, canvasStrokes)) {
      fillRun(ctx, canvasStrokes)
    }
  }
  ctx.restore()
}

/** Adds shared-edge pixel coverage before compositing over the copper. */
function drawRunOnLayer(
  ctx: CanvasContext,
  canvasStrokes: CanvasStroke[],
): boolean {
  let left = ctx.canvas.width
  let top = ctx.canvas.height
  let right = 0
  let bottom = 0
  for (const { start, end, radius } of canvasStrokes) {
    const padding = radius * MAX_MITER_RATIO + ANTIALIAS_PADDING_PX
    left = Math.min(left, start.x - padding, end.x - padding)
    top = Math.min(top, start.y - padding, end.y - padding)
    right = Math.max(right, start.x + padding, end.x + padding)
    bottom = Math.max(bottom, start.y + padding, end.y + padding)
  }
  left = Math.max(0, Math.floor(left))
  top = Math.max(0, Math.floor(top))
  right = Math.min(ctx.canvas.width, Math.ceil(right))
  bottom = Math.min(ctx.canvas.height, Math.ceil(bottom))
  if (right <= left || bottom <= top) return true

  const layerCtx = createDrawingLayerContext(ctx, right - left, bottom - top)
  if (!layerCtx) return false

  layerCtx.translate(-left, -top)
  // Source-over on the separate polygons would darken their shared edges.
  layerCtx.globalCompositeOperation = "lighter"
  fillRun(layerCtx, canvasStrokes)

  ctx.save()
  ctx.translate(left, top)
  const merged = mergeDrawingLayer(ctx, layerCtx)
  ctx.restore()
  return merged
}

function fillRun(ctx: CanvasContext, canvasStrokes: CanvasStroke[]): void {
  const first = canvasStrokes[0]
  const last = canvasStrokes.at(-1)
  if (first === undefined || last === undefined) return
  fillCap(ctx, first, "start")

  let startCut = first.normal
  for (const [i, stroke] of canvasStrokes.entries()) {
    const next = canvasStrokes[i + 1]
    const endCut = next === undefined ? stroke.normal : getMiter(stroke, next)
    const { start, end, radius, startColor, endColor } = stroke
    const [startLeft, startRight] = getCrossSection(start, startCut, radius)
    const [endLeft, endRight] = getCrossSection(end, endCut, radius)

    if (startColor === endColor) {
      ctx.fillStyle = startColor
      fillPolygon(ctx, [startLeft, startRight, endRight, endLeft])
    } else {
      // A linear gradient can match one angled cut. Split the quad so both
      // cuts have a uniform color and the two gradients agree on the diagonal.
      fillGradientTriangle(
        ctx,
        [startLeft, startRight, endRight],
        startColor,
        endColor,
      )
      fillGradientTriangle(
        ctx,
        [endRight, endLeft, startLeft],
        endColor,
        startColor,
      )
    }

    startCut = endCut
  }

  fillCap(ctx, last, "end")
}

function getMiter(stroke: CanvasStroke, next: CanvasStroke): Point {
  const x = stroke.normal.x + next.normal.x
  const y = stroke.normal.y + next.normal.y
  const length = Math.hypot(x, y)
  if (length < Number.EPSILON) return stroke.normal

  // Limit the miter on sharp bends and short segments. The two neighboring
  // cuts can each use at most half of a segment's length.
  const projection = Math.abs(x * stroke.normal.y - y * stroke.normal.x)
  const radius = Math.max(stroke.radius, next.radius)
  const scale = Math.min(
    2 / (length * length),
    MAX_MITER_RATIO / length,
    Math.min(stroke.length, next.length) / (2 * radius * projection),
  )
  return { x: x * scale, y: y * scale }
}

function getCrossSection(
  point: Point,
  cut: Point,
  radius: number,
): [Point, Point] {
  const dx = cut.x * radius
  const dy = cut.y * radius
  return [
    { x: point.x + dx, y: point.y + dy },
    { x: point.x - dx, y: point.y - dy },
  ]
}

function fillCap(
  ctx: CanvasContext,
  stroke: CanvasStroke,
  end: "start" | "end",
): void {
  if (
    stroke.startColor !== stroke.endColor &&
    ctx.createLinearGradient === undefined
  )
    return
  const atStart = end === "start"
  const { x, y } = atStart ? stroke.start : stroke.end
  const angle =
    Math.atan2(stroke.normal.y, stroke.normal.x) + (atStart ? 0 : Math.PI)
  ctx.fillStyle = atStart ? stroke.startColor : stroke.endColor
  ctx.beginPath()
  ctx.arc(x, y, stroke.radius, angle, angle + Math.PI)
  ctx.closePath()
  ctx.fill()
}

function fillGradientTriangle(
  ctx: CanvasContext,
  [edgeStart, edgeEnd, tip]: [Point, Point, Point],
  edgeColor: string,
  tipColor: string,
): void {
  if (ctx.createLinearGradient === undefined) return
  const normalX = edgeStart.y - edgeEnd.y
  const normalY = edgeEnd.x - edgeStart.x
  const projection =
    ((tip.x - edgeStart.x) * normalX + (tip.y - edgeStart.y) * normalY) /
    (normalX * normalX + normalY * normalY)
  if (projection === 0) return

  const gradient = ctx.createLinearGradient(
    edgeStart.x,
    edgeStart.y,
    edgeStart.x + normalX * projection,
    edgeStart.y + normalY * projection,
  )
  gradient.addColorStop(0, edgeColor)
  gradient.addColorStop(1, tipColor)
  ctx.fillStyle = gradient
  fillPolygon(ctx, [edgeStart, edgeEnd, tip])
}

function fillPolygon(ctx: CanvasContext, points: Point[]): void {
  ctx.beginPath()
  addPolygonToPath(ctx, points)
  ctx.fill()
}
