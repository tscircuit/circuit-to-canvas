import type {
  LayerRef,
  PcbCopperPour,
  PcbPlatedHole,
  PcbRenderLayer,
  PcbTrace,
  PcbVia,
} from "circuit-json"
import type { PhaseSkewStroke } from "circuit-json-to-differential-pair-phase-skew"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import { drawLine } from "../../shapes/line"
import { mergeDrawingLayer } from "../../layers/merge-drawing-layer"
import { appendPcbCopperPourPath } from "../pcb-copper-pour"
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
  phaseSkewStrokes?: PhaseSkewStroke[]
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
    phaseSkewStrokes = [],
  } = params

  const layers = new Set(getTraceLayers({ traces, renderLayers }))
  // A routed span between consecutive vias can contain no wire points.
  for (const { layer } of phaseSkewStrokes) layers.add(layer)

  for (const layer of layers) {
    const layerParams = {
      ctx,
      traces,
      layer,
      realToCanvasMat,
      colorMap,
      vias,
      platedHoles,
    }
    const layerCopperPours = copperPours.filter((pour) => pour.layer === layer)
    if (layerCopperPours.length > 0) {
      drawClippedTracesOnLayer(layerParams, layerCopperPours)
    } else {
      drawTracesOnLayer(layerParams)
    }

    for (const stroke of phaseSkewStrokes) {
      if (stroke.layer !== layer) continue
      drawLine({
        ctx,
        start: stroke.start,
        end: stroke.end,
        strokeWidth: stroke.width,
        stroke: stroke.color,
        realToCanvasMat,
      })
    }
  }
}

interface DrawTracesOnLayerParams {
  ctx: CanvasContext
  traces: PcbTrace[]
  layer: LayerRef
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  vias: PcbVia[]
  platedHoles: PcbPlatedHole[]
}

function drawClippedTracesOnLayer(
  params: DrawTracesOnLayerParams,
  copperPours: PcbCopperPour[],
): void {
  const { ctx, realToCanvasMat } = params
  const traceLayerCtx = createDrawingLayerContext(
    ctx,
    ctx.canvas.width,
    ctx.canvas.height,
  )
  if (traceLayerCtx) {
    drawTracesOnLayer({ ...params, ctx: traceLayerCtx })
    eraseCopperPoursFromTraceLayer({
      ctx: traceLayerCtx,
      copperPours,
      realToCanvasMat,
    })
    if (mergeDrawingLayer(ctx, traceLayerCtx)) return
  }

  // A custom canvas implementation may not support drawing layers.
  ctx.save()
  clipToOutsideCopperPours({ ctx, copperPours, realToCanvasMat })
  drawTracesOnLayer(params)
  ctx.restore()
}

function drawTracesOnLayer(params: DrawTracesOnLayerParams): void {
  const { traces, ...drawingParams } = params
  for (const trace of traces) {
    drawPcbTrace({ ...drawingParams, trace })
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

function getTraceLayers({
  traces,
  renderLayers,
}: {
  traces: PcbTrace[]
  renderLayers?: PcbRenderLayer[]
}): LayerRef[] {
  const layers = new Set<LayerRef>()
  for (const trace of traces) {
    for (const point of trace.route ?? []) {
      if (point.route_type === "wire" && point.layer) layers.add(point.layer)
    }
  }
  return [...layers].filter(
    (layer) =>
      !renderLayers?.length ||
      renderLayers.includes(`${layer}_copper` as PcbRenderLayer),
  )
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
