import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
  PcbTrace,
} from "circuit-json"
import type { DrawElementsOptions } from "../../CircuitToCanvasDrawer"

/** A phase-skew segment with the Canvas colors at its endpoints. */
export type PhaseSkewStroke = PcbDifferentialPairPhaseSkewSegment & {
  startColor: string
  endColor: string
  intermediateStops: { offset: number; color: string }[]
}

/** Consecutive runs of strokes, grouped by copper layer. */
export type PhaseSkewStrokesByLayer = Map<LayerRef, PhaseSkewStroke[][]>

const DEFAULT_PHASE_SKEW_FULL_SCALE_MM = 0.1
const MAX_RGB_CHANNEL = 255
const JOINT_TOLERANCE_MM = 1e-6

/** Collects phase-skew strokes for visible traces and copper layers. */
export function getDrawablePhaseSkewStrokes({
  elements,
  drawableTraces,
  options,
}: {
  elements: AnyCircuitElement[]
  drawableTraces: PcbTrace[]
  options: DrawElementsOptions
}): PhaseSkewStrokesByLayer | undefined {
  if (!options.showDifferentialPairPhaseSkew) return

  const requestedScaleMm = options.differentialPairPhaseSkewFullScaleMm
  const fullScaleMm =
    requestedScaleMm !== undefined &&
    Number.isFinite(requestedScaleMm) &&
    requestedScaleMm > 0
      ? requestedScaleMm
      : DEFAULT_PHASE_SKEW_FULL_SCALE_MM
  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    for (const trace of [element.positive_trace, element.negative_trace]) {
      if (!drawableTraceIds.has(trace.pcb_trace_id)) continue
      addTraceStrokes({
        trace,
        strokesByLayer,
        layers: options.layers,
        fullScaleMm,
      })
    }
  }

  return strokesByLayer
}

function addTraceStrokes({
  trace,
  strokesByLayer,
  layers,
  fullScaleMm,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  strokesByLayer: PhaseSkewStrokesByLayer
  layers: DrawElementsOptions["layers"]
  fullScaleMm: number
}): void {
  const thresholds = [-fullScaleMm, 0, fullScaleMm]
  let run: PhaseSkewStroke[] = []
  const filterLayers = layers !== undefined && layers.length > 0
  for (const segment of trace.segments) {
    if (
      segment.width <= 0 ||
      (filterLayers &&
        !layers.some((layer) => layer === `${segment.layer}_copper`))
    ) {
      run = []
      continue
    }

    if (
      segment.start.x === segment.end.x &&
      segment.start.y === segment.end.y
    ) {
      continue
    }

    const previous = run.at(-1)
    if (
      previous === undefined ||
      previous.layer !== segment.layer ||
      Math.hypot(
        previous.end.x - segment.start.x,
        previous.end.y - segment.start.y,
      ) > JOINT_TOLERANCE_MM
    ) {
      run = []
      const layerRuns = strokesByLayer.get(segment.layer)
      if (layerRuns === undefined) strokesByLayer.set(segment.layer, [run])
      else layerRuns.push(run)
    }

    const startMm = segment.start_length_difference_mm
    const endMm = segment.end_length_difference_mm
    const startColor = getSkewColor(startMm, fullScaleMm)
    const endColor = getSkewColor(endMm, fullScaleMm)
    const intermediateStops: PhaseSkewStroke["intermediateStops"] = []
    if (startColor !== endColor) {
      // Saturation and zero change the slope of the color gradient.
      for (const thresholdMm of thresholds) {
        const offset = (thresholdMm - startMm) / (endMm - startMm)
        if (offset > 0 && offset < 1) {
          intermediateStops.push({
            offset,
            color: getSkewColor(thresholdMm, fullScaleMm),
          })
        }
      }
    }
    run.push({ ...segment, startColor, endColor, intermediateStops })
  }
}

/** Blends white toward blue for a lead or red for a lag. */
function getSkewColor(differenceMm: number, fullScaleMm: number): string {
  const strength = Math.min(1, Math.abs(differenceMm) / fullScaleMm)
  const fadedChannel = Math.round(MAX_RGB_CHANNEL * (1 - strength))

  if (differenceMm > 0) {
    return `rgb(${fadedChannel}, ${fadedChannel}, ${MAX_RGB_CHANNEL})`
  }
  return `rgb(${MAX_RGB_CHANNEL}, ${fadedChannel}, ${fadedChannel})`
}
