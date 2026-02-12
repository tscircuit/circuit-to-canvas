import type { AnyCircuitElement } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"
import { drawBoardSoldermask } from "./board"
import { processCutoutSoldermask } from "./cutout"
import { processHoleSoldermask } from "./hole"
import { processPlatedHoleSoldermask } from "./plated-hole"
import { processSmtPadSoldermask } from "./smt-pad"
import { processTraceSoldermask } from "./trace"
import { processViaSoldermask } from "./via"

export interface DrawPcbSoldermaskParams {
  ctx: CanvasContext
  board: import("circuit-json").PcbBoard
  elements: AnyCircuitElement[]
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  layer: "top" | "bottom"
  drawSoldermask: boolean
}

/**
 * Draws the soldermask layer for the PCB as a unified geometry.
 *
 * The soldermask is drawn as a single unified layer that covers the entire board.
 * Elements "cut through" the soldermask using destination-out openings and selective overlays:
 *
 * 1. Draw full soldermask covering the board (dark green)
 * 2. For each element that needs an opening:
 *    - If positive/zero margin: subtract opening shape from soldermask
 *    - If negative margin: subtract inner opening and draw soldermask-over-copper ring
 * 3. For elements with is_covered_with_soldermask: draw soldermask-over-copper on top
 */
export function drawPcbSoldermask(params: DrawPcbSoldermaskParams): void {
  const {
    ctx,
    board,
    elements,
    realToCanvasMat,
    colorMap,
    layer,
    drawSoldermask,
  } = params

  if (!drawSoldermask) return
  if (ctx.canvas.width <= 0 || ctx.canvas.height <= 0) return

  const soldermaskColor = colorMap.soldermask[layer] ?? colorMap.soldermask.top
  const soldermaskOverCopperColor =
    colorMap.soldermaskOverCopper[layer] ?? colorMap.soldermaskOverCopper.top

  const soldermaskCtx =
    createSoldermaskLayerContext(ctx, ctx.canvas.width, ctx.canvas.height) ??
    ctx

  // Step 1: Draw the full soldermask covering the board
  drawBoardSoldermask({
    ctx: soldermaskCtx,
    board,
    realToCanvasMat,
    soldermaskColor,
  })

  // Step 2: Draw soldermask over traces first so pads can open over them.
  for (const element of elements) {
    if (element.type !== "pcb_trace") continue
    processTraceSoldermask({
      ctx: soldermaskCtx,
      trace: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      layer,
    })
  }

  // Step 3: Process remaining elements - draw cutouts and openings as needed
  for (const element of elements) {
    processElementSoldermask({
      ctx: soldermaskCtx,
      element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      layer,
      colorMap,
    })
  }

  compositeSoldermaskLayer(ctx, soldermaskCtx)
}

/**
 * Process soldermask for an element by drawing on top of the soldermask layer.
 * This subtracts openings from the soldermask layer and draws selective mask overlays.
 */
function processElementSoldermask(params: {
  ctx: CanvasContext
  element: AnyCircuitElement
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  soldermaskOverCopperColor: string
  layer: "top" | "bottom"
}): void {
  const {
    ctx,
    element,
    realToCanvasMat,
    colorMap,
    soldermaskOverCopperColor,
    layer,
  } = params

  if (element.type === "pcb_smtpad") {
    processSmtPadSoldermask({
      ctx,
      pad: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      layer,
    })
  } else if (element.type === "pcb_plated_hole") {
    processPlatedHoleSoldermask({
      ctx,
      hole: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      layer,
    })
  } else if (element.type === "pcb_hole") {
    processHoleSoldermask({
      ctx,
      hole: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
    })
  } else if (element.type === "pcb_via") {
    processViaSoldermask({
      ctx,
      via: element,
      realToCanvasMat,
    })
  } else if (element.type === "pcb_cutout") {
    processCutoutSoldermask({
      ctx,
      cutout: element,
      realToCanvasMat,
      colorMap,
    })
  } else if (element.type === "pcb_trace") {
    return
  }
}

function createSoldermaskLayerContext(
  baseCtx: CanvasContext,
  width: number,
  height: number,
): CanvasContext | null {
  if (width <= 0 || height <= 0) return null

  const g = globalThis
  let layerCanvas: HTMLCanvasElement | OffscreenCanvas | null = null

  if (typeof g.OffscreenCanvas === "function") {
    layerCanvas = new g.OffscreenCanvas(width, height)
  } else if (typeof g.document?.createElement === "function") {
    layerCanvas = g.document.createElement("canvas")
    layerCanvas.width = width
    layerCanvas.height = height
  } else if (typeof (baseCtx.canvas as any)?.constructor === "function") {
    try {
      const CanvasCtor = (baseCtx.canvas as any).constructor
      layerCanvas = new CanvasCtor(width, height)
    } catch {
      return null
    }
  }

  const layerCtx = layerCanvas?.getContext?.("2d")
  return layerCtx ?? null
}

function compositeSoldermaskLayer(
  baseCtx: CanvasContext,
  soldermaskCtx: CanvasContext,
): void {
  if (baseCtx === soldermaskCtx) return
  if (soldermaskCtx.canvas.width <= 0 || soldermaskCtx.canvas.height <= 0)
    return
  const writeCtx = baseCtx as CanvasRenderingContext2D
  if (typeof writeCtx.createPattern !== "function") {
    return
  }
  let pattern: CanvasPattern | null = null
  try {
    pattern = writeCtx.createPattern(
      soldermaskCtx.canvas as HTMLCanvasElement,
      "no-repeat",
    )
  } catch {
    return
  }
  if (!pattern) return
  writeCtx.save()
  writeCtx.globalCompositeOperation = "source-over"
  writeCtx.fillStyle = pattern
  writeCtx.fillRect(
    0,
    0,
    soldermaskCtx.canvas.width,
    soldermaskCtx.canvas.height,
  )
  writeCtx.restore()
}
