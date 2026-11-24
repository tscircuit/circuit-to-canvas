import type { AnyCircuitElement, PcbRenderLayer, PcbTrace } from "circuit-json"
import {
  getDifferentialPairPhaseSkewStrokes,
  type PhaseSkewStroke,
} from "circuit-json-to-differential-pair-phase-skew"
import type { DrawElementsOptions } from "../../CircuitToCanvasDrawer"

export function getDrawablePhaseSkewStrokes(
  {
    elements,
    drawableTraces,
  }: {
    elements: AnyCircuitElement[]
    drawableTraces: PcbTrace[]
  },
  {
    showDifferentialPairPhaseSkew,
    phaseSkewColors,
    layers,
  }: DrawElementsOptions,
): PhaseSkewStroke[] | undefined {
  if (!showDifferentialPairPhaseSkew) return undefined

  const phaseSkewStrokes = getDifferentialPairPhaseSkewStrokes(elements, {
    colors: phaseSkewColors,
  })
  if (!phaseSkewStrokes.length) return phaseSkewStrokes

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )
  return phaseSkewStrokes.filter(
    (stroke) =>
      drawableTraceIds.has(stroke.pcb_trace_id) &&
      (!layers?.length ||
        layers.includes(`${stroke.layer}_copper` as PcbRenderLayer)),
  )
}
