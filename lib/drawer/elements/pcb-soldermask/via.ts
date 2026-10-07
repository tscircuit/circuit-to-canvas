import type { PcbVia, PcbViaInput } from "circuit-json"
import Color from "color"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { cutPathFromSoldermask } from "./cut-path-from-soldermask"

/**
 * Process soldermask for a via.
 * Vias typically have soldermask openings to expose the copper ring.
 */
export function processViaSoldermask(params: {
  ctx: CanvasContext
  via: PcbVia
  realToCanvasMat: Matrix
  layer: "top" | "bottom"
  soldermaskOverCopperColor: string
}): void {
  const { ctx, via, realToCanvasMat, layer, soldermaskOverCopperColor } = params
  if (!via.layers.includes(layer)) return

  const isTented = isViaTented(via, layer, ctx)

  // Vias typically have soldermask openings to expose the copper ring.
  const [cx, cy] = applyToPoint(realToCanvasMat, [via.x, via.y])
  const scaledRadius = (via.outer_diameter / 2) * Math.abs(realToCanvasMat.a)

  ctx.beginPath()
  ctx.arc(cx, cy, scaledRadius, 0, Math.PI * 2)
  ctx.closePath()
  if (isTented) {
    const holeRadius = (via.hole_diameter / 2) * Math.abs(realToCanvasMat.a)
    // Paint the ring and center separately so translucent mask alpha is applied once.
    ctx.moveTo(cx + holeRadius, cy)
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = soldermaskOverCopperColor
    ctx.fill("evenodd")

    const maskColor = Color(soldermaskOverCopperColor)
    const holeColor = Color.rgb(
      maskColor.red() / 2,
      maskColor.green() / 2,
      maskColor.blue() / 2,
    ).alpha(maskColor.alpha())
    // Shade the hole beneath the mask without changing the drill geometry.
    ctx.fillStyle = holeColor.string()
    ctx.beginPath()
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2)
    ctx.fill()
  } else {
    cutPathFromSoldermask(ctx)
  }
}

export function isViaTented(
  via: PcbVia,
  layer: "top" | "bottom",
  ctx: CanvasContext,
): boolean {
  let board = ctx.boardOwnerMap?.get(via.pcb_via_id)
  if (!ctx.boardOwnerMap?.has(via.pcb_via_id) && via.pcb_trace_id) {
    board = ctx.boardOwnerMap?.get(via.pcb_trace_id)
  }

  const tenting: PcbViaInput = via
  const viaTenting =
    layer === "top" ? tenting.tented_on_top : tenting.tented_on_bottom
  const boardDefaultTenting =
    layer === "top"
      ? board?.default_via_tented_on_top
      : board?.default_via_tented_on_bottom
  return viaTenting ?? tenting.is_tented ?? boardDefaultTenting ?? false
}
