import type {
  AnyCircuitElement,
  PcbBoard,
  PcbPanel,
  PcbPlatedHole,
  PcbVia,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { CanvasContext, PcbColorMap } from "../../types"
import { createDrawingLayerContext } from "../../layers/create-drawing-layer-context"
import { mergeDrawingLayer } from "../../layers/merge-drawing-layer"
import { drawBoardSoldermask } from "./board"
import { drawPanelSoldermask } from "./panel"
import { processCutoutSoldermask } from "./cutout"
import { processCopperPourSoldermask } from "./copper-pour/copper-pour"
import { processHoleSoldermask } from "./hole"
import { processPlatedHoleSoldermask } from "./plated-hole"
import { processSmtPadSoldermask } from "./smt-pad"
import { processTraceSoldermask } from "./trace"
import { isViaTented, processViaSoldermask } from "./via"
import { drawSoldermaskOpening } from "../draw-soldermask-opening"

export interface DrawPcbSoldermaskParams {
  ctx: CanvasContext
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
 * 2. Draw substrate borders for all positive-margin openings.
 * 3. For each element that needs an opening:
 *    - If positive/zero margin: subtract opening shape from soldermask
 *    - If negative margin: subtract inner opening and draw soldermask-over-copper ring
 * 4. Covered SMT pads with zero margins remain fully masked; holes remain open.
 */
export function drawPcbSoldermask(params: DrawPcbSoldermaskParams): void {
  const { ctx, realToCanvasMat, colorMap, layer, drawSoldermask } = params
  let { elements } = params

  if (!drawSoldermask) return
  if (ctx.canvas.width <= 0 || ctx.canvas.height <= 0) return

  const boards = elements.filter(
    (el): el is PcbBoard => el.type === "pcb_board",
  )
  const panel = elements.find((el): el is PcbPanel => el.type === "pcb_panel")
  if (boards.length === 0 && !panel) {
    elements = elements.filter((element) => element.type === "pcb_via")
  }

  const soldermaskColor = colorMap.soldermask[layer] ?? colorMap.soldermask.top
  const soldermaskOverCopperColor =
    colorMap.soldermaskOverCopper[layer] ?? colorMap.soldermaskOverCopper.top
  const soldermaskOverHoleColor =
    colorMap.soldermaskOverHole[layer] ?? colorMap.soldermaskOverHole.top
  const vias = elements.filter((el): el is PcbVia => el.type === "pcb_via")
  const platedHoles = elements.filter(
    (el): el is PcbPlatedHole => el.type === "pcb_plated_hole",
  )

  const soldermaskCtx =
    createDrawingLayerContext(ctx, ctx.canvas.width, ctx.canvas.height) ?? ctx

  // Step 1: Draw base soldermask surfaces (panel and boards).
  if (panel) {
    drawPanelSoldermask({
      ctx: soldermaskCtx,
      panel,
      realToCanvasMat,
      soldermaskColor,
    })
  }

  // Keep panel soldermask only on panel rails when boards are present.
  if (panel && boards.length > 0) {
    soldermaskCtx.save()
    soldermaskCtx.globalCompositeOperation = "destination-out"
    for (const board of boards) {
      drawBoardSoldermask({
        ctx: soldermaskCtx,
        board,
        realToCanvasMat,
        soldermaskColor: "#000",
      })
    }
    soldermaskCtx.restore()
  }

  for (const board of boards) {
    drawBoardSoldermask({
      ctx: soldermaskCtx,
      board,
      realToCanvasMat,
      soldermaskColor,
    })
  }

  // Step 2: Draw soldermask over traces and pours first so pads can open over them.
  for (const element of elements) {
    if (element.type === "pcb_trace") {
      processTraceSoldermask({
        ctx: soldermaskCtx,
        trace: element,
        realToCanvasMat,
        soldermaskOverCopperColor,
        layer,
        vias,
        platedHoles,
      })
    } else if (element.type === "pcb_copper_pour") {
      processCopperPourSoldermask({
        ctx: soldermaskCtx,
        pour: element,
        realToCanvasMat,
        soldermaskOverCopperColor,
        layer,
        elements,
      })
    }
  }

  // Tent vias before opening pads and holes, so their openings remain exposed.
  for (const via of vias) {
    if (!isViaTented(via, layer, soldermaskCtx)) continue
    processViaSoldermask({
      ctx: soldermaskCtx,
      via,
      realToCanvasMat,
      layer,
      soldermaskOverCopperColor,
      soldermaskOverHoleColor,
    })
  }

  // Step 3: Paint all positive-margin borders before clearing any openings.
  for (const element of elements) {
    processElementSoldermask({
      ctx: soldermaskCtx,
      element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      soldermaskOverHoleColor,
      copperColor: colorMap.copper[layer],
      substrateColor: colorMap.substrate,
      layer,
      phase: "substrate",
    })
  }

  // Step 4: Draw pad masks before drill openings. Negative and mixed margins
  // paint opaque copper, which must not cover an earlier hole or exposed via.
  for (const element of elements) {
    if (element.type !== "pcb_smtpad") continue
    processSmtPadSoldermask({
      ctx: soldermaskCtx,
      pad: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      copperColor: colorMap.copper[layer],
      substrateColor: colorMap.substrate,
      layer,
      phase: "openings",
    })
  }

  // Step 5: Apply hole, exposed-via, and cutout openings after all pad fills.
  for (const element of elements) {
    if (element.type === "pcb_smtpad") continue
    processElementSoldermask({
      ctx: soldermaskCtx,
      element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      soldermaskOverHoleColor,
      copperColor: colorMap.copper[layer],
      substrateColor: colorMap.substrate,
      layer,
      phase: "openings",
    })
  }

  soldermaskCtx.save()
  soldermaskCtx.globalCompositeOperation = "destination-out"
  for (const element of elements) {
    if (element.type !== "pcb_soldermask_opening" || element.layer !== layer)
      continue
    drawSoldermaskOpening({
      ctx: soldermaskCtx,
      opening: element,
      realToCanvasMat,
      fill: "#000",
    })
  }
  soldermaskCtx.restore()
  mergeDrawingLayer(ctx, soldermaskCtx)
}

/**
 * Process soldermask for an element by drawing on top of the soldermask layer.
 * This subtracts openings from the soldermask layer and draws selective mask overlays.
 */
function processElementSoldermask(params: {
  ctx: CanvasContext
  element: AnyCircuitElement
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  soldermaskOverHoleColor: string
  copperColor: string
  substrateColor: string
  layer: "top" | "bottom"
  phase: "substrate" | "openings"
}): void {
  const {
    ctx,
    element,
    realToCanvasMat,
    soldermaskOverCopperColor,
    soldermaskOverHoleColor,
    copperColor,
    substrateColor,
    layer,
    phase,
  } = params

  if (element.type === "pcb_smtpad") {
    processSmtPadSoldermask({
      ctx,
      pad: element,
      realToCanvasMat,
      soldermaskOverCopperColor,
      copperColor,
      substrateColor,
      layer,
      phase,
    })
  } else if (element.type === "pcb_plated_hole") {
    processPlatedHoleSoldermask({
      ctx,
      hole: element,
      substrateColor,
      realToCanvasMat,
      soldermaskOverCopperColor,
      layer,
      phase,
    })
  } else if (element.type === "pcb_hole") {
    processHoleSoldermask({
      ctx,
      hole: element,
      substrateColor,
      realToCanvasMat,
      soldermaskOverCopperColor,
      phase,
    })
  } else if (phase === "substrate") {
    return
  } else if (element.type === "pcb_via") {
    if (isViaTented(element, layer, ctx)) return
    processViaSoldermask({
      ctx,
      via: element,
      realToCanvasMat,
      layer,
      soldermaskOverCopperColor,
      soldermaskOverHoleColor,
    })
  } else if (element.type === "pcb_cutout") {
    processCutoutSoldermask({
      ctx,
      cutout: element,
      realToCanvasMat,
    })
  } else if (element.type === "pcb_copper_pour") {
    return
  } else if (element.type === "pcb_trace") {
    return
  }
}
