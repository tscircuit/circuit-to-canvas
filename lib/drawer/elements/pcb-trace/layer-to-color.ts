import type { LayerRef } from "circuit-json"
import type { PcbColorMap } from "../../types"

export function layerToColor(layer: LayerRef, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}
