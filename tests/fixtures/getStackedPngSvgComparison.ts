import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import type { Bounds } from "@tscircuit/math-utils"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { stackPngsVertically, svgToPng } from "./stackPngsVertically"

export interface StackedPngSvgComparisonOptions {
  width?: number
  height?: number
  padding?: number
}

function getPcbElements(elements: AnyCircuitElement[]): AnyCircuitElement[] {
  return elements.filter(
    (el) =>
      el.type.startsWith("pcb_") &&
      !el.type.includes("solder_paste") &&
      !el.type.includes("port"),
  )
}

function calculateBounds(
  elements: AnyCircuitElement[],
  padding: number,
): Bounds {
  const board = elements.find((el) => el.type === "pcb_board") as
    | { center: { x: number; y: number }; width: number; height: number }
    | undefined

  if (!board) {
    return { minX: -padding, maxX: padding, minY: -padding, maxY: padding }
  }

  return {
    minX: board.center.x - board.width / 2 - padding,
    maxX: board.center.x + board.width / 2 + padding,
    minY: board.center.y - board.height / 2 - padding,
    maxY: board.center.y + board.height / 2 + padding,
  }
}

/**
 * Generate a stacked PNG comparison of circuit-to-canvas vs circuit-to-svg rendering.
 *
 * @param circuitJson - Array of circuit elements to render
 * @param options - Optional configuration for width, height, and padding
 * @returns Promise<Buffer> - Stacked PNG with both renderings labeled
 */
export async function getStackedPngSvgComparison(
  circuitJson: AnyCircuitElement[],
  options: StackedPngSvgComparisonOptions = {},
): Promise<Buffer> {
  const { width = 400, height = 800, padding = 4 } = options

  const pcbElements = getPcbElements(circuitJson)
  const bounds = calculateBounds(pcbElements, padding)

  // Generate circuit-to-canvas PNG
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, width, height)

  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  })
  drawer.drawElements(pcbElements)

  const canvasPng = canvas.toBuffer("image/png")

  // Generate circuit-to-svg PNG
  const svg = convertCircuitJsonToPcbSvg(circuitJson, {
    width,
    height,
  })
  const svgPng = svgToPng(svg)

  // Stack both PNGs vertically with labels
  const stackedPng = await stackPngsVertically([
    { png: canvasPng, label: "circuit-to-canvas" },
    { png: svgPng, label: "circuit-to-svg" },
  ])

  return stackedPng
}
