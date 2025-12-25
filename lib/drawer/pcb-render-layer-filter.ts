import type { AnyCircuitElement } from "circuit-json"
import type {
  PcbRenderLayer,
  DrawElementsOptions,
} from "./CircuitToCanvasDrawer"

/**
 * Gets the render layer for an element based on its type and layer property
 */
export function getElementRenderLayer(
  element: AnyCircuitElement,
): PcbRenderLayer | PcbRenderLayer[] | null {
  // Copper elements (pads, traces, copper pour, copper text)
  if (element.type === "pcb_smtpad") {
    const layer = element.layer
    return `${layer}_copper` as PcbRenderLayer
  }

  if (element.type === "pcb_trace") {
    // Traces can span multiple layers, return all layers from route
    if (!element.route || !Array.isArray(element.route)) return null
    const layers = new Set<PcbRenderLayer>()
    for (const point of element.route) {
      if ("layer" in point && point.layer) {
        layers.add(`${point.layer}_copper` as PcbRenderLayer)
      }
    }
    return layers.size > 0 ? Array.from(layers) : null
  }

  if (element.type === "pcb_copper_pour") {
    const layer = element.layer
    return `${layer}_copper` as PcbRenderLayer
  }

  if (element.type === "pcb_copper_text") {
    const layer = element.layer
    return `${layer}_copper` as PcbRenderLayer
  }

  // Silkscreen elements
  if (
    element.type === "pcb_silkscreen_text" ||
    element.type === "pcb_silkscreen_rect" ||
    element.type === "pcb_silkscreen_circle" ||
    element.type === "pcb_silkscreen_line" ||
    element.type === "pcb_silkscreen_path"
  ) {
    const layer = element.layer
    return `${layer}_silkscreen` as PcbRenderLayer
  }

  // Fabrication note elements
  if (
    element.type === "pcb_fabrication_note_text" ||
    element.type === "pcb_fabrication_note_rect" ||
    element.type === "pcb_fabrication_note_path"
  ) {
    const layer = element.layer
    return `${layer}_fabrication_note` as PcbRenderLayer
  }

  // Elements without layer filtering (always drawn)
  // These include: pcb_board, pcb_hole, pcb_plated_hole, pcb_via, pcb_cutout,
  // pcb_note_rect, pcb_note_path, pcb_note_text, pcb_note_line, pcb_note_dimension
  return null
}

/**
 * Checks if an element should be drawn based on layer options
 */
export function shouldDrawElement(
  element: AnyCircuitElement,
  options: DrawElementsOptions,
): boolean {
  // If no layers specified, draw all elements
  if (!options.layers || options.layers.length === 0) {
    return true
  }

  const elementLayers = getElementRenderLayer(element)

  // If element has no layer info (board, holes, etc.), always draw
  if (elementLayers === null) {
    return true
  }

  // Check if any of the element's layers match the requested layers
  if (Array.isArray(elementLayers)) {
    return elementLayers.some((layer) => options.layers!.includes(layer))
  }

  return options.layers.includes(elementLayers)
}
