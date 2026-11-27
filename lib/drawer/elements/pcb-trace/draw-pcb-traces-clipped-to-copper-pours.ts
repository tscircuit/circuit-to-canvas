import { createPcbPhaseSkewIndex } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  LayerRef,
  PcbCopperPour,
  PcbPlatedHole,
  PcbRenderLayer,
  PcbTrace,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { DrawElementsOptions } from "../../CircuitToCanvasDrawer"
import type { CanvasContext, PcbColorMap } from "../../types"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import { mergeDrawingLayer } from "../../layers/merge-drawing-layer"
import { appendPcbCopperPourPath } from "../pcb-copper-pour"
import { drawPhaseSkewStrokes } from "./draw-phase-skew-strokes"
import { getPhaseSkewStrokes } from "./get-phase-skew-strokes"
import { drawPcbTrace } from "./pcb-trace"

export function drawPcbTracesClippedToCopperPours(params: {
  ctx: CanvasContext
  traces: PcbTrace[]
  copperPours: PcbCopperPour[]
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  vias: PcbVia[]
  platedHoles: PcbPlatedHole[]
  renderLayers?: PcbRenderLayer[]
  phaseSkew?: { elements: AnyCircuitElement[]; options: DrawElementsOptions }
}): void {
  const {
    ctx,
    traces,
    copperPours,
    realToCanvasMat,
    colorMap,
    vias,
    platedHoles,
    renderLayers,
    phaseSkew,
  } = params

  const phaseSkewStrokes = phaseSkew?.options.showDifferentialPairPhaseSkew
    ? getPhaseSkewStrokes({
        index: createPcbPhaseSkewIndex(
          phaseSkew.options.clipContextElements
            ? [...phaseSkew.options.clipContextElements, ...phaseSkew.elements]
            : phaseSkew.elements,
        ),
        colors: phaseSkew.options.phaseSkewColors,
        ctx,
        drawableTraceIds: new Set(traces.map((trace) => trace.pcb_trace_id)),
        layers: phaseSkew.options.layers,
      })
    : undefined
  const layers = getTraceLayers(traces, renderLayers)
  // A segment between consecutive vias may have no matching wire point.
  for (const layer of phaseSkewStrokes?.keys() ?? []) {
    if (!layers.includes(layer)) layers.push(layer)
  }

  for (const layer of layers) {
    const skewStrokes =
      phaseSkewStrokes === undefined ? undefined : phaseSkewStrokes.get(layer)
    const layerCopperPours = copperPours.filter((pour) => pour.layer === layer)

    if (layerCopperPours.length === 0) {
      drawTracesOnLayer({
        ctx,
        traces,
        layer,
        realToCanvasMat,
        colorMap,
        vias,
        platedHoles,
      })
      drawPhaseSkewStrokes({ ctx, strokes: skewStrokes, realToCanvasMat })
      continue
    }

    const traceLayerCtx = createDrawingLayerContext(
      ctx,
      ctx.canvas.width,
      ctx.canvas.height,
    )

    if (traceLayerCtx) {
      drawTracesOnLayer({
        ctx: traceLayerCtx,
        traces,
        layer,
        realToCanvasMat,
        colorMap,
        vias,
        platedHoles,
      })
      eraseCopperPoursFromTraceLayer({
        ctx: traceLayerCtx,
        copperPours: layerCopperPours,
        realToCanvasMat,
      })
      if (mergeDrawingLayer(ctx, traceLayerCtx)) {
        drawPhaseSkewStrokes({ ctx, strokes: skewStrokes, realToCanvasMat })
        continue
      }
    }

    // A custom canvas implementation may not support drawing layers. Keep a
    // clip-based fallback so trace rendering remains available in that case.
    ctx.save()
    clipToOutsideCopperPours({
      ctx,
      copperPours: layerCopperPours,
      realToCanvasMat,
    })
    drawTracesOnLayer({
      ctx,
      traces,
      layer,
      realToCanvasMat,
      colorMap,
      vias,
      platedHoles,
    })
    ctx.restore()
    drawPhaseSkewStrokes({ ctx, strokes: skewStrokes, realToCanvasMat })
  }
}

function drawTracesOnLayer(params: {
  ctx: CanvasContext
  traces: PcbTrace[]
  layer: LayerRef
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  vias: PcbVia[]
  platedHoles: PcbPlatedHole[]
}): void {
  const { ctx, traces, layer, realToCanvasMat, colorMap, vias, platedHoles } =
    params

  for (const trace of traces) {
    drawPcbTrace({
      ctx,
      trace,
      realToCanvasMat,
      colorMap,
      vias,
      platedHoles,
      layer,
    })
  }
}

function eraseCopperPoursFromTraceLayer(params: {
  ctx: CanvasContext
  copperPours: PcbCopperPour[]
  realToCanvasMat: Matrix
}): void {
  const { ctx, copperPours, realToCanvasMat } = params
  if (copperPours.length === 0) return

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "#000"

  for (const pour of copperPours) {
    ctx.beginPath()
    appendPcbCopperPourPath({ ctx, pour, realToCanvasMat })
    ctx.fill(pour.shape === "brep" ? "evenodd" : "nonzero")
  }

  ctx.restore()
}

function getTraceLayers(
  traces: PcbTrace[],
  renderLayers?: PcbRenderLayer[],
): LayerRef[] {
  const layers = new Set<LayerRef>()
  for (const trace of traces) {
    for (const point of trace.route ?? []) {
      if (point.route_type !== "wire" || !point.layer) continue
      if (
        renderLayers?.length &&
        !renderLayers.includes(`${point.layer}_copper` as PcbRenderLayer)
      ) {
        continue
      }
      layers.add(point.layer)
    }
  }
  return [...layers]
}

/** Clips to the complement of the finalized copper regions on this layer. */
function clipToOutsideCopperPours(params: {
  ctx: CanvasContext
  copperPours: PcbCopperPour[]
  realToCanvasMat: Matrix
}): void {
  const { ctx, copperPours, realToCanvasMat } = params
  if (copperPours.length === 0) return

  // Finalized pour regions on one layer are non-overlapping solids. Appending
  // all of them to one even-odd path keeps this fallback to one layer clip.
  ctx.beginPath()
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const pour of copperPours) {
    appendPcbCopperPourPath({ ctx, pour, realToCanvasMat })
  }
  ctx.clip("evenodd")
}
