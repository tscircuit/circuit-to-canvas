import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
} from "circuit-json"
import type { DrawElementsOptions } from "../../CircuitToCanvasDrawer"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import type { CanvasContext } from "../../types"

/** A phase-skew segment with the Canvas colors at its endpoints. */
export type PhaseSkewStroke = Pick<
  PcbDifferentialPairPhaseSkewSegment,
  "start" | "end" | "width" | "layer"
> & {
  startColor: string
  endColor: string
  /** A zero skew limit makes the trace interior solid even at a zero-colored cap. */
  solidColor?: string
}

/** Consecutive runs of strokes, grouped by copper layer. */
export type PhaseSkewStrokesByLayer = Map<LayerRef, PhaseSkewStroke[][]>

export const DEFAULT_PHASE_SKEW_FULL_SCALE_MM = 2
const JOINT_TOLERANCE_MM = 1e-6
type Rgba = readonly [number, number, number, number]
const DEFAULT_COLORS = {
  zero: [255, 255, 255, 1],
  positive: [0, 0, 255, 1],
  negative: [255, 0, 0, 1],
} satisfies Record<string, Rgba>
type PhaseSkewPalette = Record<keyof typeof DEFAULT_COLORS, Rgba>

/** Collects phase-skew strokes for the traces in `elements` on visible copper layers. */
export function getPhaseSkewStrokes({
  elements,
  colors,
  ctx,
  layers,
  clipContextElements,
}: {
  elements: AnyCircuitElement[]
  colors?: DrawElementsOptions["phaseSkewColors"]
  ctx: CanvasContext
  layers?: DrawElementsOptions["layers"]
  clipContextElements?: AnyCircuitElement[]
}): PhaseSkewStrokesByLayer {
  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()

  const drawableTraceIds = new Set(
    elements.flatMap((element) =>
      element.type === "pcb_trace" ? [element.pcb_trace_id] : [],
    ),
  )
  const fullScaleMmBySourceBusId = getPhaseSkewFullScaleMmBySourceBusId({
    elements: clipContextElements
      ? [...clipContextElements, ...elements]
      : elements,
  })
  const palette = getPalette({ ctx, colors })

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    const fullScaleMm =
      fullScaleMmBySourceBusId[element.source_bus_id] ??
      DEFAULT_PHASE_SKEW_FULL_SCALE_MM
    for (const trace of [element.positive_trace, element.negative_trace]) {
      if (!drawableTraceIds.has(trace.pcb_trace_id)) continue
      addTraceStrokes({
        trace,
        strokesByLayer,
        layers,
        fullScaleMm,
        palette,
      })
    }
  }

  return strokesByLayer
}

export function getPhaseSkewFullScaleMmBySourceBusId({
  elements,
}: {
  elements: AnyCircuitElement[]
}): Record<string, number> {
  const fullScaleMmBySourceBusId: Record<string, number> = Object.create(null)
  for (const element of elements) {
    if (element.type !== "source_bus") continue
    const { source_bus_id, max_length_skew } = element
    if (max_length_skew === undefined) {
      delete fullScaleMmBySourceBusId[source_bus_id]
    } else {
      fullScaleMmBySourceBusId[source_bus_id] = max_length_skew
    }
  }
  return fullScaleMmBySourceBusId
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
  layers: DrawElementsOptions["layers"]
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
      const { start, end, width, layer } = part
      const startColor = getPhaseSkewColor({
        lengthDifferenceMm: part.start_length_difference_mm,
        fullScaleMm,
        colors: palette,
      })
      const endColor = getPhaseSkewColor({
        lengthDifferenceMm: part.end_length_difference_mm,
        fullScaleMm,
        colors: palette,
      })
      const stroke: PhaseSkewStroke = {
        start,
        end,
        width,
        layer,
        startColor,
        endColor,
      }
      if (fullScaleMm === 0 && startColor !== endColor) {
        stroke.solidColor =
          part.start_length_difference_mm === 0 ? endColor : startColor
      }
      run.push(stroke)
    }
  }
}

export function splitPhaseSkewSegmentAtFullScale({
  segment,
  fullScaleMm,
}: {
  segment: PcbDifferentialPairPhaseSkewSegment
  fullScaleMm: number
}): PcbDifferentialPairPhaseSkewSegment[] {
  const {
    start,
    end,
    start_length_difference_mm: startDifference,
    end_length_difference_mm: endDifference,
  } = segment
  const startMagnitude = Math.abs(startDifference)
  const endMagnitude = Math.abs(endDifference)
  if (
    Math.min(startMagnitude, endMagnitude) < fullScaleMm &&
    Math.max(startMagnitude, endMagnitude) > fullScaleMm
  ) {
    // Each segment has one sign, so the signed limit is the skew at the split.
    const t = (fullScaleMm - startMagnitude) / (endMagnitude - startMagnitude)
    const split = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y),
    }
    const splitDifference =
      Math.sign(
        startMagnitude > fullScaleMm ? startDifference : endDifference,
      ) * fullScaleMm
    return [
      { ...segment, end: split, end_length_difference_mm: splitDifference },
      { ...segment, start: split, start_length_difference_mm: splitDifference },
    ]
  }
  return [segment]
}

function getPalette({
  ctx,
  colors,
}: {
  ctx: CanvasContext
  colors: DrawElementsOptions["phaseSkewColors"]
}): PhaseSkewPalette {
  if (colors === undefined) return DEFAULT_COLORS

  // Use one pixel per color to reuse the renderer's CSS color parser.
  const sampleCtx = createDrawingLayerContext(ctx, 3, 1)
  if (!sampleCtx?.getImageData) return DEFAULT_COLORS

  const parse = ({
    color,
    fallback,
    x,
  }: {
    color: string | undefined
    fallback: Rgba
    x: number
  }): Rgba => {
    if (color === undefined) return fallback
    sampleCtx.fillStyle = formatColor({ rgba: fallback })
    sampleCtx.fillStyle = color
    sampleCtx.fillRect(x, 0, 1, 1)
    const [r, g, b, a] = sampleCtx.getImageData!(x, 0, 1, 1).data
    return [r!, g!, b!, a! / 255]
  }

  return {
    zero: parse({ color: colors.zero, fallback: DEFAULT_COLORS.zero, x: 0 }),
    positive: parse({
      color: colors.positive,
      fallback: DEFAULT_COLORS.positive,
      x: 1,
    }),
    negative: parse({
      color: colors.negative,
      fallback: DEFAULT_COLORS.negative,
      x: 2,
    }),
  }
}

export function getPhaseSkewColor({
  lengthDifferenceMm,
  fullScaleMm,
  colors: { zero, positive, negative },
}: {
  lengthDifferenceMm: number
  fullScaleMm: number
  colors: PhaseSkewPalette
}): string {
  if (lengthDifferenceMm === 0) return formatColor({ rgba: zero })
  const target = lengthDifferenceMm > 0 ? positive : negative
  const intensity =
    fullScaleMm === 0
      ? 1
      : Math.min(1, Math.abs(lengthDifferenceMm) / fullScaleMm)
  const mix = ({ index }: { index: 0 | 1 | 2 | 3 }) =>
    zero[index] + intensity * (target[index] - zero[index])

  return formatColor({
    rgba: [
      Math.round(mix({ index: 0 })),
      Math.round(mix({ index: 1 })),
      Math.round(mix({ index: 2 })),
      mix({ index: 3 }),
    ],
  })
}

function formatColor({ rgba: [r, g, b, a] }: { rgba: Rgba }): string {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
}
