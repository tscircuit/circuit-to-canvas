import type { AnyCircuitElement, PcbTrace } from "circuit-json"

export const interpolatedBend = {
  type: "pcb_trace",
  pcb_trace_id: "interpolated-bend",
  route_thickness_mode: "interpolated",
  route: [
    { route_type: "wire", x: 2, y: -2, width: 2, layer: "top" },
    { route_type: "wire", x: 8, y: -2, width: 2, layer: "top" },
    { route_type: "wire", x: 8, y: 4, width: 2, layer: "top" },
  ],
} satisfies PcbTrace

export const interpolatedBendRepro: AnyCircuitElement[] = [
  {
    ...interpolatedBend,
    pcb_trace_id: "constant-bend",
    route_thickness_mode: "constant",
    route: interpolatedBend.route.map((point) => ({
      ...point,
      x: point.x - 12,
    })),
  },
  interpolatedBend,
  ...[
    { x: -6, y: 6, text: "CONTROL: CONSTANT 2mm" },
    { x: 6, y: 6, text: "FIX: INTERPOLATED 2mm" },
    { x: 0, y: -5, text: "ALL VERTEX WIDTHS ARE 2mm: BENDS MUST NOT NARROW" },
  ].map(({ x, y, text }, index) => ({
    type: "pcb_note_text" as const,
    pcb_note_text_id: `bend-label-${index}`,
    layer: "top" as const,
    text,
    anchor_position: { x, y },
    anchor_alignment: "center" as const,
    font: "tscircuit2024" as const,
    font_size: 0.6,
  })),
]
