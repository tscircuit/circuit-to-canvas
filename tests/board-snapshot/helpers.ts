import type { AnyCircuitElement } from "circuit-json"
import usbcFlashlightCircuit from "../fixtures/usb-c-flashlight.json"

export const circuitElements = usbcFlashlightCircuit as AnyCircuitElement[]

/**
 * Get PCB elements only (filter out source/schematic elements)
 */
export function getPcbElements(
  elements: AnyCircuitElement[],
): AnyCircuitElement[] {
  return elements.filter(
    (el) =>
      el.type.startsWith("pcb_") &&
      !el.type.includes("solder_paste") &&
      !el.type.includes("port"),
  )
}

/**
 * Calculate bounds from circuit elements for camera positioning
 */
export function calculateBounds(elements: AnyCircuitElement[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const el of elements) {
    if (el.type === "pcb_board") {
      const board = el as {
        center: { x: number; y: number }
        width: number
        height: number
      }
      minX = Math.min(minX, board.center.x - board.width / 2)
      maxX = Math.max(maxX, board.center.x + board.width / 2)
      minY = Math.min(minY, board.center.y - board.height / 2)
      maxY = Math.max(maxY, board.center.y + board.height / 2)
    }
  }

  // Add some padding
  const padding = 1
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  }
}
