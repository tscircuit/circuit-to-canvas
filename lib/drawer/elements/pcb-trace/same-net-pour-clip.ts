import type {
  AnyCircuitElement,
  LayerRef,
  PcbCopperPour,
  PcbTrace,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { addCopperPourPath } from "../pcb-copper-pour"

export function getSourceNetIdsForPcbTrace(
  trace: PcbTrace,
  elements: AnyCircuitElement[],
): Set<string> {
  const netIds = new Set<string>()
  const { source_trace_id } = trace
  if (!source_trace_id) return netIds

  for (const elm of elements) {
    // Some traces reference their net directly via source_trace_id
    if (elm.type === "source_net" && elm.source_net_id === source_trace_id) {
      netIds.add(elm.source_net_id)
    }
    if (
      elm.type === "source_trace" &&
      elm.source_trace_id === source_trace_id
    ) {
      for (const netId of elm.connected_source_net_ids ?? []) {
        netIds.add(netId)
      }
    }
  }

  return netIds
}

export function getSameNetCopperPoursForTrace(
  trace: PcbTrace,
  elements: AnyCircuitElement[],
): PcbCopperPour[] {
  const netIds = getSourceNetIdsForPcbTrace(trace, elements)
  if (netIds.size === 0) return []

  return elements.filter(
    (elm): elm is PcbCopperPour =>
      elm.type === "pcb_copper_pour" &&
      elm.source_net_id !== undefined &&
      netIds.has(elm.source_net_id),
  )
}

/**
 * Clips the canvas so that subsequent drawing is only visible outside the
 * given pours on the given layer (pour holes / brep inner rings stay
 * drawable). Returns true when a clip was applied - the caller must then
 * call ctx.restore() after drawing.
 */
export function applySameNetPourClip({
  ctx,
  pours,
  layer,
  realToCanvasMat,
}: {
  ctx: CanvasContext
  pours: PcbCopperPour[]
  layer: LayerRef
  realToCanvasMat: Matrix
}): boolean {
  const layerPours = pours.filter((pour) => pour.layer === layer)
  if (layerPours.length === 0) return false

  ctx.save()
  ctx.beginPath()
  // Full-canvas rect plus pour outlines with the evenodd rule keeps
  // everything outside the pours (and inside pour holes) drawable.
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const pour of layerPours) {
    addCopperPourPath(ctx, pour, realToCanvasMat)
  }
  ctx.clip("evenodd")
  return true
}
