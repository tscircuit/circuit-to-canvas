import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
  PcbRenderLayer,
  PcbTrace,
} from "circuit-json"
import type { PhaseSkewColors } from "../../CircuitToCanvasDrawer"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import type { CanvasContext } from "../../types"

/** A phase-skew segment with the Canvas colors at its endpoints. */
export type PhaseSkewStroke = Pick<
  PcbDifferentialPairPhaseSkewSegment,
  "start" | "end" | "width" | "layer"
> & {
  startColor: string
  endColor: string
  /** A zero full scale makes the trace interior solid even at a zero-colored cap. */
  solidColor?: string
}

/** Consecutive runs of strokes, grouped by copper layer. */
export type PhaseSkewStrokesByLayer = Map<LayerRef, PhaseSkewStroke[][]>

const JOINT_TOLERANCE_MM = 1e-6
type Rgba = readonly [number, number, number, number]
const DEFAULT_COLORS = {
  zero: [255, 255, 255, 1],
  positive: [0, 0, 255, 1],
  negative: [255, 0, 0, 1],
} satisfies Record<string, Rgba>
type PhaseSkewPalette = Record<keyof typeof DEFAULT_COLORS, Rgba>

/** Collects phase-skew strokes for visible traces and copper layers. */
export function getPhaseSkewStrokes({
  elements,
  fullScaleMm,
  fullScaleMmBySourceBusId,
  colors,
  ctx,
  drawableTraces,
  layers,
}: {
  elements: AnyCircuitElement[]
  fullScaleMm: number
  fullScaleMmBySourceBusId?: Record<string, number>
  colors?: PhaseSkewColors
  ctx: CanvasContext
  drawableTraces: PcbTrace[]
  layers?: PcbRenderLayer[]
}): PhaseSkewStrokesByLayer {
  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )
  const palette = getPalette({ ctx, colors })

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    const pairFullScaleMm =
      fullScaleMmBySourceBusId?.[element.source_bus_id] ?? fullScaleMm
    for (const trace of [element.positive_trace, element.negative_trace]) {
      if (!drawableTraceIds.has(trace.pcb_trace_id)) continue
      addTraceStrokes({
        trace,
        strokesByLayer,
        layers,
        fullScaleMm: pairFullScaleMm,
        palette,
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
  palette,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  strokesByLayer: PhaseSkewStrokesByLayer
  layers?: PcbRenderLayer[]
  fullScaleMm: number
  palette: PhaseSkewPalette
}): void {
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

    for (const part of splitPhaseSkewSegmentAtFullScale({
      segment,
      fullScaleMm,
    })) {
      const {
        start,
        end,
        width,
        layer,
        start_length_difference_mm: startDifference,
        end_length_difference_mm: endDifference,
      } = part
      const startColor = getPhaseSkewColor({
        lengthDifferenceMm: startDifference,
        fullScaleMm,
        colors: palette,
      })
      const endColor = getPhaseSkewColor({
        lengthDifferenceMm: endDifference,
        fullScaleMm,
        colors: palette,
      })
      const solidColor =
        fullScaleMm === 0 && startColor !== endColor
          ? startDifference === 0
            ? endColor
            : startColor
          : undefined
      run.push({ start, end, width, layer, startColor, endColor, solidColor })
    }
  }
}

/** Split where the skew reaches full color so the gradient ends there. */
export function splitPhaseSkewSegmentAtFullScale({
  segment,
  fullScaleMm,
}: {
  segment: PcbDifferentialPairPhaseSkewSegment
  fullScaleMm: number
}): PcbDifferentialPairPhaseSkewSegment[] {
  const { start, end, start_length_difference_mm, end_length_difference_mm } =
    segment
  const startMagnitude = Math.abs(start_length_difference_mm)
  const endMagnitude = Math.abs(end_length_difference_mm)
  if (
    fullScaleMm <= Math.min(startMagnitude, endMagnitude) ||
    fullScaleMm >= Math.max(startMagnitude, endMagnitude)
  ) {
    return [segment]
  }

  const t = (fullScaleMm - startMagnitude) / (endMagnitude - startMagnitude)
  const split = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  }
  // Circuit JSON segments have a single sign. Keep the split exactly at full scale.
  const splitDifference =
    Math.sign(start_length_difference_mm || end_length_difference_mm) *
    fullScaleMm
  return [
    { ...segment, end: split, end_length_difference_mm: splitDifference },
    { ...segment, start: split, start_length_difference_mm: splitDifference },
  ]
}

function getPalette({
  ctx,
  colors,
}: {
  ctx: CanvasContext
  colors?: PhaseSkewColors
}): PhaseSkewPalette {
  if (colors === undefined) return DEFAULT_COLORS

  // Use one pixel per color to reuse the renderer's CSS color parser.
  const sampleCtx = createDrawingLayerContext(ctx, 3, 1)
  if (!sampleCtx?.getImageData) return DEFAULT_COLORS

  const parse = ({
    key,
    x,
  }: {
    key: keyof PhaseSkewPalette
    x: number
  }): Rgba => {
    const color = colors[key]
    const fallback = DEFAULT_COLORS[key]
    if (color === undefined) return fallback
    sampleCtx.fillStyle = formatColor({ rgba: fallback })
    sampleCtx.fillStyle = color
    sampleCtx.fillRect(x, 0, 1, 1)
    const [r, g, b, a] = sampleCtx.getImageData!(x, 0, 1, 1).data
    return [r!, g!, b!, a! / 255]
  }

  return {
    zero: parse({ key: "zero", x: 0 }),
    positive: parse({ key: "positive", x: 1 }),
    negative: parse({ key: "negative", x: 2 }),
  }
}

/** Interpolate between the zero color and the fully saturated skew color. */
export function getPhaseSkewColor({
  lengthDifferenceMm,
  fullScaleMm,
  colors: { zero, positive, negative } = DEFAULT_COLORS,
}: {
  lengthDifferenceMm: number
  fullScaleMm: number
  colors?: PhaseSkewPalette
}): string {
  if (lengthDifferenceMm === 0) return formatColor({ rgba: zero })
  const target = lengthDifferenceMm > 0 ? positive : negative
  const fraction =
    fullScaleMm === 0
      ? 1
      : Math.min(1, Math.abs(lengthDifferenceMm) / fullScaleMm)
  const [r, g, b, a] = zero

  return formatColor({
    rgba: [
      Math.round(r + fraction * (target[0] - r)),
      Math.round(g + fraction * (target[1] - g)),
      Math.round(b + fraction * (target[2] - b)),
      a + fraction * (target[3] - a),
    ],
  })
}

function formatColor({ rgba: [r, g, b, a] }: { rgba: Rgba }): string {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
}
