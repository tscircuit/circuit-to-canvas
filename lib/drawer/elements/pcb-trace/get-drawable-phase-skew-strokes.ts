import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkewSegment,
  PcbDifferentialPairPhaseSkewTrace,
  PcbTrace,
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

export const DEFAULT_PHASE_SKEW_SCALE_MM = 2
const JOINT_TOLERANCE_MM = 1e-6
type Rgba = readonly [number, number, number, number]
const DEFAULT_COLORS = {
  zero: [255, 255, 255, 1],
  positive: [0, 0, 255, 1],
  negative: [255, 0, 0, 1],
} satisfies Record<string, Rgba>
type PhaseSkewPalette = Record<keyof typeof DEFAULT_COLORS, Rgba>

/** Collects phase-skew strokes for visible traces and copper layers. */
export function getDrawablePhaseSkewStrokes({
  ctx,
  elements,
  drawableTraces,
  options,
}: {
  ctx: CanvasContext
  elements: AnyCircuitElement[]
  drawableTraces: PcbTrace[]
  options: DrawElementsOptions
}): PhaseSkewStrokesByLayer | undefined {
  if (!options.showDifferentialPairPhaseSkew) return

  const strokesByLayer: PhaseSkewStrokesByLayer = new Map()

  const drawableTraceIds = new Set(
    drawableTraces.map(({ pcb_trace_id }) => pcb_trace_id),
  )
  const scaleByBusId = new Map<string, number | undefined>()
  for (const group of [options.clipContextElements ?? [], elements]) {
    for (const element of group) {
      if (element.type !== "source_bus") continue
      scaleByBusId.set(element.source_bus_id, element.max_length_skew)
    }
  }
  const palette = getPalette(ctx, options.phaseSkewColors)

  for (const element of elements) {
    if (element.type !== "pcb_differential_pair_phase_skew") continue
    const scaleMm =
      scaleByBusId.get(element.source_bus_id) ?? DEFAULT_PHASE_SKEW_SCALE_MM
    for (const trace of [element.positive_trace, element.negative_trace]) {
      if (!drawableTraceIds.has(trace.pcb_trace_id)) continue
      addTraceStrokes({
        trace,
        strokesByLayer,
        layers: options.layers,
        scaleMm,
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
  scaleMm,
  palette,
}: {
  trace: PcbDifferentialPairPhaseSkewTrace
  strokesByLayer: PhaseSkewStrokesByLayer
  layers: DrawElementsOptions["layers"]
  scaleMm: number
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

    const startDifference = segment.start_length_difference_mm
    const endDifference = segment.end_length_difference_mm
    const startColor = getSkewColor(startDifference, scaleMm, palette)
    const endColor = getSkewColor(endDifference, scaleMm, palette)
    const { start, end, width, layer } = segment
    const stroke = { start, end, width, layer, startColor, endColor }

    // Each segment has only one sign. Split where its magnitude reaches the
    // limit so the two-stop gradients do not stretch the fade beyond it.
    const startMagnitude = Math.abs(startDifference)
    const endMagnitude = Math.abs(endDifference)
    if (
      Math.min(startMagnitude, endMagnitude) < scaleMm &&
      Math.max(startMagnitude, endMagnitude) > scaleMm
    ) {
      const t = (scaleMm - startMagnitude) / (endMagnitude - startMagnitude)
      const split = {
        x: start.x + t * (end.x - start.x),
        y: start.y + t * (end.y - start.y),
      }
      const splitColor = startMagnitude > scaleMm ? startColor : endColor
      run.push(
        { ...stroke, end: split, endColor: splitColor },
        { ...stroke, start: split, startColor: splitColor },
      )
    } else if (scaleMm === 0 && startColor !== endColor) {
      run.push({
        ...stroke,
        solidColor: startDifference === 0 ? endColor : startColor,
      })
    } else {
      run.push(stroke)
    }
  }
}

function getPalette(
  ctx: CanvasContext,
  colors: DrawElementsOptions["phaseSkewColors"],
): PhaseSkewPalette {
  if (colors === undefined) return DEFAULT_COLORS

  // Use one pixel per color to reuse the renderer's CSS color parser.
  const sampleCtx = createDrawingLayerContext(ctx, 3, 1)
  if (!sampleCtx?.getImageData) return DEFAULT_COLORS

  const parse = (
    color: string | undefined,
    fallback: Rgba,
    x: number,
  ): Rgba => {
    if (color === undefined) return fallback
    sampleCtx.fillStyle = formatColor(fallback)
    sampleCtx.fillStyle = color
    sampleCtx.fillRect(x, 0, 1, 1)
    const [r, g, b, a] = sampleCtx.getImageData!(x, 0, 1, 1).data
    return [r!, g!, b!, a! / 255]
  }

  return {
    zero: parse(colors.zero, DEFAULT_COLORS.zero, 0),
    positive: parse(colors.positive, DEFAULT_COLORS.positive, 1),
    negative: parse(colors.negative, DEFAULT_COLORS.negative, 2),
  }
}

function getSkewColor(
  differenceMm: number,
  scaleMm: number,
  { zero, positive, negative }: PhaseSkewPalette,
): string {
  if (differenceMm === 0) return formatColor(zero)
  const target = differenceMm > 0 ? positive : negative
  const intensity =
    scaleMm === 0 ? 1 : Math.min(1, Math.abs(differenceMm) / scaleMm)
  const mix = (index: 0 | 1 | 2 | 3) =>
    zero[index] + intensity * (target[index] - zero[index])

  return formatColor([
    Math.round(mix(0)),
    Math.round(mix(1)),
    Math.round(mix(2)),
    mix(3),
  ])
}

function formatColor([r, g, b, a]: Rgba): string {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
}
