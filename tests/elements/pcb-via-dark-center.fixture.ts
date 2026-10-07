import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbVia } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { DEFAULT_PCB_COLOR_MAP, type PcbColorMap } from "../../lib/drawer/types"

const via: PcbVia = {
  type: "pcb_via",
  pcb_via_id: "inherited",
  subcircuit_id: "board",
  x: -2,
  y: 1.5,
  outer_diameter: 2,
  hole_diameter: 1,
  layers: ["top", "bottom"],
}

export const circuit: AnyCircuitElement[] = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    subcircuit_id: "board",
    center: { x: 0, y: 0 },
    width: 9,
    height: 8,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    min_via_hole_diameter: 1,
    min_via_pad_diameter: 2,
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  },
  via,
  {
    ...via,
    pcb_via_id: "override",
    x: 2,
    tented_on_top: false,
    tented_on_bottom: true,
  },
  {
    ...via,
    pcb_via_id: "pad_overlap",
    x: 2,
    y: -1.5,
    tented_on_bottom: true,
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "route_via",
    subcircuit_id: "board",
    route: [
      { route_type: "wire", x: -3.5, y: -1.5, layer: "top", width: 0.3 },
      { route_type: "wire", x: -2, y: -1.5, layer: "top", width: 0.3 },
      {
        route_type: "via",
        x: -2,
        y: -1.5,
        from_layer: "top",
        to_layer: "bottom",
        hole_diameter: 1,
        outer_diameter: 2,
        tented_on_bottom: true,
      },
    ],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "top_pad",
    pcb_component_id: "component",
    subcircuit_id: "board",
    shape: "rect",
    x: 1.4,
    y: -1.5,
    width: 1.2,
    height: 2,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "bottom_pad",
    pcb_component_id: "component",
    subcircuit_id: "board",
    shape: "rect",
    x: 1.4,
    y: -1.5,
    width: 1.2,
    height: 2,
    layer: "bottom",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "top_title",
    pcb_component_id: "component",
    subcircuit_id: "board",
    anchor_position: { x: 0, y: 3.2 },
    anchor_alignment: "center",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.6,
    text: "VIA TENTING",
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "bottom_title",
    pcb_component_id: "component",
    subcircuit_id: "board",
    anchor_position: { x: 0, y: 3.2 },
    anchor_alignment: "center",
    layer: "bottom",
    font: "tscircuit2024",
    font_size: 0.6,
    text: "VIA TENTING",
  },
]

export function renderViaDarkCenter(
  layer: "top" | "bottom",
  drawSoldermask = true,
  colorOverrides?: Partial<PcbColorMap>,
) {
  const canvas = createCanvas(600, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  if (colorOverrides) {
    drawer.configure({ colorOverrides })
  }
  drawer.drawElements(circuit, {
    layers:
      layer === "top"
        ? ["top_copper", "top_silkscreen"]
        : ["bottom_copper", "bottom_silkscreen"],
    drawSoldermask,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })
  return {
    canvas,
    pixel(x: number, y: number) {
      const [cx, cy] = applyToPoint(drawer.realToCanvasMat, [x, y])
      return Array.from(
        ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data,
      )
    },
  }
}

export function renderTranslucentVia(layer: "top" | "bottom") {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -2, maxX: 2, minY: -2, maxY: 2 })
  drawer.configure({
    colorOverrides: {
      copper: {
        ...DEFAULT_PCB_COLOR_MAP.copper,
        top: "transparent",
        bottom: "transparent",
      },
      drill: "transparent",
      soldermaskOverCopper: {
        top: "rgba(128,192,240,0.5)",
        bottom: "rgba(128,192,240,0.5)",
      },
      soldermaskOverHole: {
        top: "rgba(64,96,120,0.5)",
        bottom: "rgba(64,96,120,0.5)",
      },
    },
  })
  drawer.drawElements(
    [
      {
        type: "pcb_via",
        pcb_via_id: "translucent_via",
        x: 0,
        y: 0,
        outer_diameter: 2,
        hole_diameter: 1,
        layers: ["top", "bottom"],
        tented_on_top: true,
        tented_on_bottom: true,
      },
    ],
    {
      layers: [layer === "top" ? "top_copper" : "bottom_copper"],
      drawSoldermask: true,
      drawSoldermaskTop: layer === "top",
      drawSoldermaskBottom: layer === "bottom",
    },
  )
  const center = Array.from(ctx.getImageData(100, 100, 1, 1).data)
  const ring = Array.from(ctx.getImageData(140, 100, 1, 1).data)
  return { center, ring }
}
