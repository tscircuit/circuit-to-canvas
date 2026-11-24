import {
  type AnyCircuitJsonId,
  getElementId,
} from "@tscircuit/circuit-json-util"
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
    clipContextElements,
  }: DrawElementsOptions,
): PhaseSkewStroke[] | undefined {
  if (!showDifferentialPairPhaseSkew) return undefined

  // Context supplies pair metadata and partner traces omitted by subset passes.
  // Drawn elements override cached context without duplicating traces or buses.
  const elementsById = new Map<AnyCircuitJsonId, AnyCircuitElement>()
  for (const element of [...(clipContextElements ?? []), ...elements]) {
    elementsById.set(getElementId(element), element)
  }
  const phaseSkewStrokes = getDifferentialPairPhaseSkewStrokes(
    [...elementsById.values()],
    {
      colors: phaseSkewColors,
    },
  )
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
