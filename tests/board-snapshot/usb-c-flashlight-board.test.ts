import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getBoundsFromPoints, type Bounds } from "@tscircuit/math-utils"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { stackPngsVertically, svgToPng } from "../fixtures/stackPngsVertically"
import usbcFlashlightCircuit from "../fixtures/usb-c-flashlight.json"

const circuitElements = usbcFlashlightCircuit as AnyCircuitElement[]

function getPcbElements(elements: AnyCircuitElement[]): AnyCircuitElement[] {
  return elements.filter(
    (el) =>
      el.type.startsWith("pcb_") &&
      !el.type.includes("solder_paste") &&
      !el.type.includes("port"),
  )
}

function calculateBounds(elements: AnyCircuitElement[]): Bounds {
  const points: { x: number; y: number }[] = []

  for (const el of elements) {
    if (el.type === "pcb_board") {
      const board = el as {
        center: { x: number; y: number }
        width: number
        height: number
      }
      points.push(
        {
          x: board.center.x - board.width / 2,
          y: board.center.y - board.height / 2,
        },
        {
          x: board.center.x + board.width / 2,
          y: board.center.y - board.height / 2,
        },
        {
          x: board.center.x - board.width / 2,
          y: board.center.y + board.height / 2,
        },
        {
          x: board.center.x + board.width / 2,
          y: board.center.y + board.height / 2,
        },
      )
    }
  }

  const bounds = getBoundsFromPoints(points)

  const padding = 4
  return {
    minX: (bounds?.minX ?? 0) - padding,
    maxX: (bounds?.maxX ?? 0) + padding,
    minY: (bounds?.minY ?? 0) - padding,
    maxY: (bounds?.maxY ?? 0) + padding,
  }
}

test("USB-C flashlight - comprehensive comparison (circuit-to-canvas vs circuit-to-svg)", async () => {
  const pcbElements = getPcbElements(circuitElements)
  const bounds = calculateBounds(pcbElements)

  // Generate circuit-to-canvas PNG
  const canvas = createCanvas(400, 800)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 800)

  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: -bounds.maxY,
    maxY: -bounds.minY,
  })
  drawer.drawElements(pcbElements)

  const canvasPng = canvas.toBuffer("image/png")

  // Generate circuit-to-svg PNG
  const svg = convertCircuitJsonToPcbSvg(circuitElements, {
    width: 400,
    height: 800,
  })
  const svgPng = svgToPng(svg)

  // Stack both PNGs vertically with labels
  const stackedPng = await stackPngsVertically([
    { png: canvasPng, label: "circuit-to-canvas" },
    { png: svgPng, label: "circuit-to-svg" },
  ])

  await expect(stackedPng).toMatchPngSnapshot(import.meta.path)
})
