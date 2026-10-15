import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import type { CanvasContext } from "../../lib/drawer/types"
import { drawText } from "../../lib/drawer/shapes/text"
import { identity } from "transformation-matrix"

const viewport = { minX: -2, maxX: 2, minY: -2, maxY: 2 }

export const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 4,
  height: 4,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

export const kinds = ["pad", "hole", "plated hole"] as const

type Kind = (typeof kinds)[number]

export function element(
  kind: Kind,
  layer: "top" | "bottom",
): Extract<
  AnyCircuitElement,
  { type: "pcb_smtpad" | "pcb_hole" | "pcb_plated_hole" }
> {
  if (kind === "pad") {
    return {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "circle",
      layer,
      x: 0,
      y: 0,
      radius: 1,
    }
  }
  if (kind === "hole") {
    return {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "circle",
      x: 0,
      y: 0,
      hole_diameter: 2,
    }
  }
  return {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pth",
    shape: "circle",
    layers: ["top", "bottom"],
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 0.6,
  }
}

export async function renderPair({
  circuit,
  layer,
  enabled = true,
  drawBoardMaterial = false,
}: {
  circuit: AnyCircuitElement[]
  layer: "top" | "bottom"
  enabled?: boolean
  drawBoardMaterial?: boolean
}) {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, 400, 400)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds(viewport)
  drawer.drawElements(circuit, {
    layers: [`${layer}_copper`],
    drawBoardMaterial,
    drawSoldermask: enabled,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })
  // The published SVG renderer receives exactly the same circuit JSON.
  // Never rewrite flags/margins or patch the reference renderer in this test.
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    width: 400,
    height: 400,
    viewport,
    layer,
    showSolderMask: enabled,
    drawPaddingOutsideBoard: true,
    includeVersion: false,
    backgroundColor: "#000",
  })
  const reference = createCanvas(400, 400)
  reference
    .getContext("2d")
    .drawImage(
      await loadImage(
        new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng(),
      ),
      0,
      0,
    )
  return { canvas, reference }
}

export function materialAt({
  canvas,
  x,
  y = 0,
}: {
  canvas: Canvas
  x: number
  y?: number
}) {
  const [r = 0, g = 0, b = 0] = canvas
    .getContext("2d")
    .getImageData(
      Math.round(200 + x * 100),
      Math.round(200 - y * 100),
      1,
      1,
    ).data
  if (r > 240 && b > 200 && g < 80) return "drill"
  if (g > r && g > b) return "mask"
  if (r > 150 && g > 100 && b < 150) return "substrate"
  if (r > 150 && g < 100) return "copper"
  if (b > 150 && b > r) return "copper"
  return "background"
}

export function label({
  ctx,
  text,
  x,
  y,
  fontSize = 18,
}: {
  ctx: CanvasContext
  text: string
  x: number
  y: number
  fontSize?: number
}) {
  // Stroke the bundled alphabet so snapshots do not depend on OS fonts.
  drawText({
    ctx,
    text,
    x,
    y,
    fontSize,
    color: "white",
    realToCanvasMat: identity(),
    anchorAlignment: "bottom_left",
  })
}

export const shapeCases: Array<{ item: AnyCircuitElement; rotation?: number }> =
  [
    {
      item: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "rect",
        shape: "rect",
        layer: "top",
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        corner_radius: 0.3,
      },
    },
    {
      item: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "rotated-rect",
        shape: "rotated_rect",
        layer: "top",
        x: 0,
        y: 0,
        width: 2,
        height: 2,
        corner_radius: 0.3,
        ccw_rotation: 30,
      },
      rotation: 30,
    },
    {
      item: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "pill",
        shape: "pill",
        layer: "top",
        x: 0,
        y: 0,
        width: 3,
        height: 2,
        radius: 1,
      },
    },
    {
      item: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "rotated-pill",
        shape: "rotated_pill",
        layer: "top",
        x: 0,
        y: 0,
        width: 3,
        height: 2,
        radius: 1,
        ccw_rotation: 30,
      },
      rotation: 30,
    },
    {
      item: {
        type: "pcb_smtpad",
        pcb_smtpad_id: "polygon",
        shape: "polygon",
        layer: "top",
        points: [
          { x: -1, y: -1 },
          { x: 1, y: -1 },
          { x: 1, y: 1 },
          { x: -1, y: 1 },
        ],
      },
    },
    {
      item: {
        type: "pcb_hole",
        pcb_hole_id: "square",
        hole_shape: "square",
        x: 0,
        y: 0,
        hole_diameter: 2,
      },
    },
    {
      item: {
        type: "pcb_hole",
        pcb_hole_id: "oval",
        hole_shape: "oval",
        x: 0,
        y: 0,
        hole_width: 3,
        hole_height: 2,
      },
    },
    {
      item: {
        type: "pcb_hole",
        pcb_hole_id: "rect",
        hole_shape: "rect",
        x: 0,
        y: 0,
        hole_width: 3,
        hole_height: 2,
      },
    },
    {
      item: {
        type: "pcb_hole",
        pcb_hole_id: "pill",
        hole_shape: "pill",
        x: 0,
        y: 0,
        hole_width: 3,
        hole_height: 2,
      },
    },
    {
      item: {
        type: "pcb_hole",
        pcb_hole_id: "rotated-pill",
        hole_shape: "rotated_pill",
        x: 0,
        y: 0,
        hole_width: 3,
        hole_height: 2,
        ccw_rotation: 30,
      },
      rotation: 30,
    },
    {
      item: {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "pill",
        ccw_rotation: 0,
        shape: "pill",
        x: 0,
        y: 0,
        outer_width: 3,
        outer_height: 2,
        hole_width: 1,
        hole_height: 0.6,
        layers: ["top", "bottom"],
      },
    },
    {
      item: {
        type: "pcb_plated_hole",
        pcb_plated_hole_id: "rect",
        shape: "circular_hole_with_rect_pad",
        hole_shape: "circle",
        pad_shape: "rect",
        hole_offset_x: 0,
        hole_offset_y: 0,
        x: 0,
        y: 0,
        rect_pad_width: 3,
        rect_pad_height: 2,
        rect_border_radius: 0.3,
        hole_diameter: 0.6,
        layers: ["top", "bottom"],
      },
    },
  ]
