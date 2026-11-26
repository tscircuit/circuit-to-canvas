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
}

/** Consecutive runs of strokes, grouped by copper layer. */
export type PhaseSkewStrokesByLayer = Map<LayerRef, PhaseSkewStroke[][]>

const MAX_RGB_CHANNEL = 255
const JOINT_TOLERANCE_MM = 1e-6

/** Uses one scale for both signs so equal magnitudes have equal saturation. */
export function getEndToEndSkewTraceColors(elements: AnyCircuitElement[]) {
  const differencesByTrace = new Map<PcbTrace["pcb_trace_id"], number>()
  let peak = 0

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    if (!("end_to_end_length_difference_mm" in element)) continue
    const differenceMm = element.end_to_end_length_difference_mm
    if (typeof differenceMm !== "number" || !Number.isFinite(differenceMm))
      continue

    peak = Math.max(peak, Math.abs(differenceMm))
    differencesByTrace.set(element.positive_trace.pcb_trace_id, differenceMm)
    differencesByTrace.set(element.negative_trace.pcb_trace_id, differenceMm)
  }

  return new Map(
    Array.from(differencesByTrace, ([traceId, differenceMm]) => [
      traceId,
      getSkewColor({ differenceMm, positivePeak: peak, negativePeak: -peak }),
    ]),
  )
}

/** Collects phase-skew strokes for visible traces and copper layers. */
export function getDrawablePhaseSkewStrokes({
  elements,
  drawableTraces,
  options,
  endToEndSkewColors,
}: {
  elements: AnyCircuitElement[]
  drawableTraces: PcbTrace[]
  options: DrawElementsOptions
  endToEndSkewColors?: ReturnType<typeof getEndToEndSkewTraceColors>
}): PhaseSkewStrokesByLayer | undefined {
  if (!options.showDifferentialPairPhaseSkew) return

  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    for (const trace of [element.positive_trace, element.negative_trace]) {
      if (!drawableTraceIds.has(trace.pcb_trace_id)) continue
      if (
        endToEndSkewColors !== undefined &&
        endToEndSkewColors.has(trace.pcb_trace_id)
      )
        continue
      addTraceStrokes({ trace, strokesByLayer, layers: options.layers })
    }
  }

  return strokesByLayer
}

/** Scales each sign to its peak over the full trace and adds visible strokes. */
function addTraceStrokes({
  trace,
  strokesByLayer,
  layers,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  strokesByLayer: PhaseSkewStrokesByLayer
  layers: DrawElementsOptions["layers"]
}): void {
  let positivePeak = 0
  let negativePeak = 0

  for (const segment of trace.segments) {
    const { start_length_difference_mm, end_length_difference_mm } = segment
    positivePeak = Math.max(
      positivePeak,
      start_length_difference_mm,
      end_length_difference_mm,
    )
    negativePeak = Math.min(
      negativePeak,
      start_length_difference_mm,
      end_length_difference_mm,
    )
  }

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

    const startColor = getSkewColor({
      differenceMm: segment.start_length_difference_mm,
      positivePeak,
      negativePeak,
    })
    const endColor = getSkewColor({
      differenceMm: segment.end_length_difference_mm,
      positivePeak,
      negativePeak,
    })
    run.push({ ...segment, startColor, endColor })
  }
}

/** Blends white toward blue for a lead or red for a lag. */
function getSkewColor({
  differenceMm,
  positivePeak,
  negativePeak,
}: {
  differenceMm: number
  positivePeak: number
  negativePeak: number
}): string {
  if (differenceMm === 0) return "rgb(255, 255, 255)"

  const peak = differenceMm > 0 ? positivePeak : negativePeak
  const fadedChannel = Math.round(MAX_RGB_CHANNEL * (1 - differenceMm / peak))

  if (differenceMm > 0) {
    return `rgb(${fadedChannel}, ${fadedChannel}, ${MAX_RGB_CHANNEL})`
  }
  return `rgb(${MAX_RGB_CHANNEL}, ${fadedChannel}, ${fadedChannel})`
}
