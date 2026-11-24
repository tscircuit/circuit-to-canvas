import type { PcbRenderLayer, PcbTrace } from "circuit-json"
import type { PhaseSkewStroke } from "circuit-json-to-differential-pair-phase-skew"

export function filterDrawablePhaseSkewStrokes({
  phaseSkewStrokes,
  drawableTraces,
  renderLayers,
}: {
  phaseSkewStrokes?: PhaseSkewStroke[]
  drawableTraces: PcbTrace[]
  renderLayers?: PcbRenderLayer[]
}): PhaseSkewStroke[] | undefined {
  if (!phaseSkewStrokes?.length) return phaseSkewStrokes

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )
  return phaseSkewStrokes.filter(
    (stroke) =>
      drawableTraceIds.has(stroke.pcb_trace_id) &&
      (!renderLayers?.length ||
        renderLayers.includes(`${stroke.layer}_copper` as PcbRenderLayer)),
  )
}
