import type { PcbSolderPaste, PcbSolderPastePolygon } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import { drawOval } from "../shapes/oval"
import { drawPill } from "../shapes/pill"
import { drawRect } from "../shapes/rect"
import type { CanvasContext } from "../types"
import { drawPolygonPath } from "./helper-functions/draw-polygon"

const SOLDER_PASTE_COLOR = "rgb(105, 105, 105)"

export interface DrawPcbSolderPasteParams {
  ctx: CanvasContext
  solderPaste: PcbSolderPaste
  realToCanvasMat: Matrix
}

function drawPolygonSolderPaste(params: {
  ctx: CanvasContext
  solderPaste: PcbSolderPastePolygon
  realToCanvasMat: Matrix
}): void {
  const { ctx, solderPaste, realToCanvasMat } = params
  if (solderPaste.points.length < 3) return

  ctx.save()
  ctx.beginPath()
  drawPolygonPath({
    ctx,
    points: solderPaste.points.map((point) =>
      applyToPoint(realToCanvasMat, point),
    ),
  })
  for (const hole of solderPaste.holes ?? []) {
    if (hole.length < 3) continue
    drawPolygonPath({
      ctx,
      points: hole.map((point) => applyToPoint(realToCanvasMat, point)),
    })
  }
  ctx.fillStyle = SOLDER_PASTE_COLOR
  ctx.fill("evenodd")
  ctx.restore()
}

export function drawPcbSolderPaste(params: DrawPcbSolderPasteParams): void {
  const { ctx, solderPaste, realToCanvasMat } = params
  if (solderPaste.shape === "polygon") {
    drawPolygonSolderPaste({ ctx, solderPaste, realToCanvasMat })
    return
  }
  const center = { x: solderPaste.x, y: solderPaste.y }

  if (solderPaste.shape === "rect") {
    drawRect({
      ctx,
      center,
      width: solderPaste.width,
      height: solderPaste.height,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (solderPaste.shape === "rotated_rect") {
    drawRect({
      ctx,
      center,
      width: solderPaste.width,
      height: solderPaste.height,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
      ccwRotationDegrees: solderPaste.ccw_rotation,
    })
    return
  }

  if (solderPaste.shape === "pill") {
    drawPill({
      ctx,
      center,
      width: solderPaste.width,
      height: solderPaste.height,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (solderPaste.shape === "rotated_pill") {
    drawPill({
      ctx,
      center,
      width: solderPaste.width,
      height: solderPaste.height,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
      rotation: solderPaste.ccw_rotation,
    })
    return
  }

  if (solderPaste.shape === "oval") {
    drawOval({
      ctx,
      center,
      radius_x: solderPaste.width / 2,
      radius_y: solderPaste.height / 2,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
    })
    return
  }

  if (solderPaste.shape === "circle") {
    drawCircle({
      ctx,
      center,
      radius: solderPaste.radius,
      fill: SOLDER_PASTE_COLOR,
      realToCanvasMat,
    })
  }
}
