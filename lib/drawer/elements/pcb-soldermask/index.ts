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
 * Elements "cut through" the soldermask by drawing on top with appropriate colors:
 *
 * 1. Draw full soldermask covering the board (dark green)
 * 2. For each element that needs a soldermask opening:
 *    - If positive margin: draw substrate color for the larger area, then copper color for pad
 *    - If zero margin: draw copper color for the pad area
 *    - If negative margin: draw copper color for the pad, then light green ring for margin
 * 3. For elements with is_covered_with_soldermask: draw light green soldermask over them
 *
 * Note: This approach draws colors ON TOP of the soldermask rather than using
 * destination-out compositing. This is necessary because some elements (plated holes,
 * vias, non-plated holes) are drawn AFTER the soldermask layer, so cutting through
 * the soldermask wouldn't reveal anything useful underneath.
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

  const soldermaskColor = colorMap.soldermask[layer] ?? colorMap.soldermask.top
  const soldermaskOverCopperColor =
    colorMap.soldermaskOverCopper[layer] ?? colorMap.soldermaskOverCopper.top

  // Step 1: Draw the full soldermask covering the board (only if enabled)
  if (drawSoldermask) {
    drawBoardSoldermask({ ctx, board, realToCanvasMat, soldermaskColor })
  }

  // Step 2: Draw soldermask over traces first so pads can open over them.
  if (drawSoldermask) {
    for (const element of elements) {
      if (element.type !== "pcb_trace") continue
      processTraceSoldermask({
        ctx,
        trace: element,
        realToCanvasMat,
        soldermaskOverCopperColor,
        layer,
        drawSoldermask,
      })
    }
  }

  // Step 3: Process remaining elements - draw cutouts and openings as needed
  for (const element of elements) {
    processElementSoldermask({
      ctx,
      element,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
      drawSoldermask,
    })
  }
}

/**
 * Process soldermask for an element by drawing on top of the soldermask layer.
 * This simulates cutouts by drawing substrate/copper colors over the soldermask.
 */
function processElementSoldermask(params: {
  ctx: CanvasContext
  element: AnyCircuitElement
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
  soldermaskOverCopperColor: string
  layer: "top" | "bottom"
  drawSoldermask: boolean
}): void {
  const {
    ctx,
    element,
    realToCanvasMat,
    colorMap,
    soldermaskOverCopperColor,
    layer,
    drawSoldermask,
  } = params

  if (element.type === "pcb_smtpad") {
    processSmtPadSoldermask({
      ctx,
      pad: element,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
      drawSoldermask,
    })
  } else if (element.type === "pcb_plated_hole") {
    processPlatedHoleSoldermask({
      ctx,
      hole: element,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      layer,
      drawSoldermask,
    })
  } else if (element.type === "pcb_hole") {
    processHoleSoldermask({
      ctx,
      hole: element,
      realToCanvasMat,
      colorMap,
      soldermaskOverCopperColor,
      drawSoldermask,
    })
  } else if (element.type === "pcb_via") {
    processViaSoldermask({
      ctx,
      via: element,
      realToCanvasMat,
      colorMap,
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
