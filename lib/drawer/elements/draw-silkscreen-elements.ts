import type {
  AnyCircuitElement,
  PcbSilkscreenText,
  PcbSilkscreenRect,
  PcbSilkscreenCircle,
  PcbSilkscreenLine,
  PcbSilkscreenPath,
  PcbSilkscreenPill,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawPcbSilkscreenText } from "./pcb-silkscreen-text"
import { drawPcbSilkscreenRect } from "./pcb-silkscreen-rect"
import { drawPcbSilkscreenCircle } from "./pcb-silkscreen-circle"
import { drawPcbSilkscreenLine } from "./pcb-silkscreen-line"
import { drawPcbSilkscreenPath } from "./pcb-silkscreen-path"
import { drawPcbSilkscreenPill } from "./pcb-silkscreen-pill"

export interface DrawSilkscreenElementsParams {
  ctx: CanvasContext
  elements: AnyCircuitElement[]
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

/**
 * Draws all silkscreen elements from the provided elements array.
 * This function filters for silkscreen element types and renders them.
 */
export function drawSilkscreenElements(
  params: DrawSilkscreenElementsParams,
): void {
  const { ctx, elements, realToCanvasMat, colorMap } = params

  for (const element of elements) {
    if (element.type === "pcb_silkscreen_text") {
      drawPcbSilkscreenText({
        ctx,
        text: element as PcbSilkscreenText,
        realToCanvasMat,
        colorMap,
      })
    } else if (element.type === "pcb_silkscreen_rect") {
      drawPcbSilkscreenRect({
        ctx,
        rect: element as PcbSilkscreenRect,
        realToCanvasMat,
        colorMap,
      })
    } else if (element.type === "pcb_silkscreen_circle") {
      drawPcbSilkscreenCircle({
        ctx,
        circle: element as PcbSilkscreenCircle,
        realToCanvasMat,
        colorMap,
      })
    } else if (element.type === "pcb_silkscreen_line") {
      drawPcbSilkscreenLine({
        ctx,
        line: element as PcbSilkscreenLine,
        realToCanvasMat,
        colorMap,
      })
    } else if (element.type === "pcb_silkscreen_path") {
      drawPcbSilkscreenPath({
        ctx,
        path: element as PcbSilkscreenPath,
        realToCanvasMat,
        colorMap,
      })
    } else if (element.type === "pcb_silkscreen_pill") {
      drawPcbSilkscreenPill({
        ctx,
        pill: element as PcbSilkscreenPill,
        realToCanvasMat,
        colorMap,
      })
    }
  }
}
