import type { LayerRef, PCBVia } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { drawCircle } from "../shapes/circle"
import type { CanvasContext, PcbColorMap } from "../types"

export interface DrawPcbViaParams {
  ctx: CanvasContext
  via: PCBVia
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer?: LayerRef
  drawSoldermask?: boolean
}

export function drawPcbVia(params: DrawPcbViaParams): void {
  const { ctx, via, realToCanvasMat, colorMap, layer = "top" } = params
  const isPlugged =
    params.drawSoldermask &&
    (layer === "top" || layer === "bottom") &&
    isViaPlugged(via, ctx)

  // Draw outer copper ring
  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.outer_diameter / 2,
    fill: colorMap.copper[layer ?? "top"],
    realToCanvasMat,
  })

  // Cut inner drill hole out of copper, then paint drill color.
  if (!isPlugged) {
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    drawCircle({
      ctx,
      center: { x: via.x, y: via.y },
      radius: via.hole_diameter / 2,
      fill: "#000",
      realToCanvasMat,
    })
    ctx.restore()
  }

  drawCircle({
    ctx,
    center: { x: via.x, y: via.y },
    radius: via.hole_diameter / 2,
    fill: isPlugged ? colorMap.substrate : colorMap.drill,
    realToCanvasMat,
  })
}

export function isViaPlugged(via: PCBVia, ctx: CanvasContext): boolean {
  let board = ctx.boardOwnerMap?.get(via.pcb_via_id)
  if (!ctx.boardOwnerMap?.has(via.pcb_via_id) && via.pcb_trace_id) {
    board = ctx.boardOwnerMap?.get(via.pcb_trace_id)
  }
  return board?.default_via_plugged === true
}
