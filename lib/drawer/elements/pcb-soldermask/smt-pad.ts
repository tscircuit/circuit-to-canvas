import type { PcbSmtPad } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawPillPath } from "../helper-functions/draw-pill"
import { drawPolygonPath } from "../helper-functions/draw-polygon"
import { drawRoundedRectPath } from "../helper-functions/draw-rounded-rect"
import { offsetPolygonPoints } from "../soldermask-margin"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"
/**
 * Process soldermask for an SMT pad.
 */
export function processSmtPadSoldermask(params: {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  substrateColor: string
  copperColor: string
  layer: "top" | "bottom"
}): void {
  const {
    ctx,
    pad,
    realToCanvasMat,
    soldermaskOverCopperColor,
    copperColor,
    substrateColor,
    layer,
  } = params
  // Only process pads on the current layer
  if (pad.layer !== layer) return

  const isCoveredWithSoldermask = pad.is_covered_with_solder_mask === true
  const margin = isCoveredWithSoldermask ? (pad.soldermask_margin ?? 0) : 0

  // Get asymmetric margins for rect shapes
  let ml = margin
  let mr = margin
  let mt = margin
  let mb = margin

  if (
    isCoveredWithSoldermask &&
    (pad.shape === "rect" || pad.shape === "rotated_rect")
  ) {
    ml = pad.soldermask_margin_left ?? margin
    mr = pad.soldermask_margin_right ?? margin
    mt = pad.soldermask_margin_top ?? margin
    mb = pad.soldermask_margin_bottom ?? margin
  }

  if (isCoveredWithSoldermask && ml === 0 && mr === 0 && mt === 0 && mb === 0) {
    // SVG covers a pad completely only when all effective margins are zero.
    ctx.fillStyle = soldermaskOverCopperColor
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml: 0, mr: 0, mt: 0, mb: 0 })
    ctx.fill()
  } else if (ml < 0 || mr < 0 || mt < 0 || mb < 0) {
    // SVG draws the covered pad, then the opening in copper. With mixed
    // margins the opening can extend beyond the original pad on one side.
    ctx.fillStyle = soldermaskOverCopperColor
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml: 0, mr: 0, mt: 0, mb: 0 })
    ctx.fill()
    ctx.fillStyle = copperColor
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml, mr, mt, mb })
    ctx.fill()
  } else if (ml > 0 || mr > 0 || mt > 0 || mb > 0) {
    // SVG shows substrate around positive openings even without board material.
    ctx.fillStyle = substrateColor
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml, mr, mt, mb })
    ctx.fill()
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml: 0, mr: 0, mt: 0, mb: 0 })
    cutPathFromSoldermask(ctx)
  } else {
    // Zero margin: cut pad opening from the soldermask.
    drawPadShapePath({ ctx, pad, realToCanvasMat, ml: 0, mr: 0, mt: 0, mb: 0 })
    cutPathFromSoldermask(ctx)
  }
}

function drawPadShapePath(params: {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
  ml: number
  mr: number
  mt: number
  mb: number
}): void {
  const { ctx, pad, realToCanvasMat, ml, mr, mt, mb } = params
  ctx.beginPath()
  const rotation =
    pad.shape === "rotated_rect" || pad.shape === "rotated_pill"
      ? (pad.ccw_rotation ?? 0)
      : 0

  if (pad.shape === "rect" || pad.shape === "rotated_rect") {
    const borderRadius = pad.corner_radius ?? pad.rect_border_radius ?? 0
    const radians = (rotation * Math.PI) / 180
    const dxLocal = (mr - ml) / 2
    const dyLocal = (mt - mb) / 2
    const dxGlobal = dxLocal * Math.cos(radians) - dyLocal * Math.sin(radians)
    const dyGlobal = dxLocal * Math.sin(radians) + dyLocal * Math.cos(radians)

    const [cx, cy] = applyToPoint(realToCanvasMat, [
      pad.x + dxGlobal,
      pad.y + dyGlobal,
    ])
    const scaledWidth = (pad.width + ml + mr) * Math.abs(realToCanvasMat.a)
    const scaledHeight = (pad.height + mt + mb) * Math.abs(realToCanvasMat.a)
    const radiusMargin = ml || mr || mt || mb ? (pad.soldermask_margin ?? 0) : 0
    const scaledRadius =
      Math.max(0, borderRadius ? borderRadius + radiusMargin : 0) *
      Math.abs(realToCanvasMat.a)
    if (scaledWidth <= 0 || scaledHeight <= 0) return

    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawRoundedRectPath({
      ctx,
      cx: 0,
      cy: 0,
      width: scaledWidth,
      height: scaledHeight,
      radius: scaledRadius,
    })
    ctx.restore()
  } else if (pad.shape === "circle") {
    const avgMargin = (ml + mr + mt + mb) / 4
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledRadius =
      Math.max(0, pad.radius + avgMargin) * Math.abs(realToCanvasMat.a)

    ctx.beginPath()
    ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
    ctx.closePath()
  } else if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    const avgMargin = (ml + mr) / 2
    const [cx, cy] = applyToPoint(realToCanvasMat, [pad.x, pad.y])
    const scaledWidth =
      (pad.width + avgMargin * 2) * Math.abs(realToCanvasMat.a)
    const scaledHeight =
      (pad.height + avgMargin * 2) * Math.abs(realToCanvasMat.a)

    if (scaledWidth <= 0 || scaledHeight <= 0) return
    ctx.save()
    ctx.translate(cx, cy)
    if (rotation !== 0) {
      ctx.rotate((-rotation * Math.PI) / 180)
    }

    ctx.beginPath()
    drawPillPath({
      ctx,
      cx: 0,
      cy: 0,
      width: scaledWidth,
      height: scaledHeight,
    })
    ctx.restore()
  } else if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    const avgMargin = (ml + mr + mt + mb) / 4
    const points =
      avgMargin !== 0 ? offsetPolygonPoints(pad.points, avgMargin) : pad.points
    const canvasPoints = points.map((p) => {
      const [x, y] = applyToPoint(realToCanvasMat, [p.x, p.y])
      return { x, y }
    })

    ctx.beginPath()
    drawPolygonPath({ ctx, points: canvasPoints })
  }
}
