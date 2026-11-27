import type { PcbPhaseSkewIndex } from "@tscircuit/circuit-json-util"
import type {
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
  pcbTraceId: string
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

/** Collects phase-skew strokes for visible traces and copper layers. */
export function getPhaseSkewStrokes({
  index,
  ctx,
  colors,
  layers,
  drawableTraceIds,
}: {
  index: PcbPhaseSkewIndex
  ctx: CanvasContext
  colors?: DrawElementsOptions["phaseSkewColors"]
  layers?: DrawElementsOptions["layers"]
  drawableTraceIds?: ReadonlySet<string>
}): PhaseSkewStrokesByLayer {
  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()
  const palette = getPalette({ ctx, colors })
  for (const { trace, maxLengthSkew } of index.values()) {
    if (drawableTraceIds && !drawableTraceIds.has(trace.pcb_trace_id)) continue
    addTraceStrokes({
      trace,
      strokesByLayer,
      layers,
      palette,
      fullScaleMm: maxLengthSkew ?? DEFAULT_PHASE_SKEW_FULL_SCALE_MM,
    })
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
        pcbTraceId: trace.pcb_trace_id,
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
