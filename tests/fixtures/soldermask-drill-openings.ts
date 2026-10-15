import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbHole, PcbPlatedHole } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

export function createStrictContext(width: number, height: number) {
  const ctx = createCanvas(width, height).getContext("2d")
  // The native test backend accepts negative radii; browsers throw for them.
  const arc = ctx.arc.bind(ctx)
  ctx.arc = (...args: Parameters<typeof ctx.arc>) => {
    if (args[2] < 0) throw new RangeError("Negative arc radius")
    arc(...args)
  }
  const ellipse = ctx.ellipse.bind(ctx)
  ctx.ellipse = (...args: Parameters<typeof ctx.ellipse>) => {
    if (args[2] < 0 || args[3] < 0) {
      throw new RangeError("Negative ellipse radius")
    }
    ellipse(...args)
  }
  return ctx
}

const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 4,
  height: 4,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

export function render({
  elements,
  layer,
  drawSoldermask = true,
}: {
  elements: AnyCircuitElement[]
  layer: "top" | "bottom"
  drawSoldermask?: boolean
}) {
  const ctx = createStrictContext(400, 400)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -2, maxX: 2, minY: -2, maxY: 2 })
  drawer.drawElements([board, ...elements], {
    layers: [`${layer}_copper`],
    drawBoardMaterial: false,
    drawSoldermask,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })
  return {
    pixels: ctx.getImageData(0, 0, 400, 400).data,
    pixel(x = 0, y = 0) {
      const [cx, cy] = applyToPoint(drawer.realToCanvasMat, [x, y])
      return Array.from(
        ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data,
      )
    },
  }
}

export const openings: AnyCircuitElement[] = [
  {
    type: "pcb_hole",
    pcb_hole_id: "hole",
    hole_shape: "circle",
    hole_diameter: 0.4,
    x: 0,
    y: 0,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated-hole",
    shape: "circle",
    hole_diameter: 0.4,
    outer_diameter: 0.7,
    layers: ["top", "bottom"],
    x: 0,
    y: 0,
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    hole_diameter: 0.4,
    outer_diameter: 0.7,
    layers: ["top", "bottom"],
    tented_on_top: false,
    tented_on_bottom: false,
    x: 0,
    y: 0,
  },
]

export const holeShapes: PcbHole[] = [
  { hole_shape: "circle", hole_diameter: 1 },
  { hole_shape: "square", hole_diameter: 1, ccw_rotation: 30 },
  { hole_shape: "oval", hole_width: 2, hole_height: 1, ccw_rotation: 30 },
  { hole_shape: "rect", hole_width: 1, hole_height: 2, ccw_rotation: 30 },
  { hole_shape: "pill", hole_width: 2, hole_height: 1 },
  {
    hole_shape: "rotated_pill",
    hole_width: 1,
    hole_height: 2,
    ccw_rotation: 30,
  },
].map((shape) => ({
  ...shape,
  type: "pcb_hole",
  pcb_hole_id: "hole",
  x: 0,
  y: 0,
})) as PcbHole[]

const platedHoleBase: Pick<
  PcbPlatedHole,
  "type" | "pcb_plated_hole_id" | "x" | "y" | "layers"
> = {
  type: "pcb_plated_hole",
  pcb_plated_hole_id: "plated-hole",
  x: 0,
  y: 0,
  layers: ["top", "bottom"],
}

export const platedHoleShapes: PcbPlatedHole[] = [
  { ...platedHoleBase, shape: "circle", outer_diameter: 1, hole_diameter: 0.3 },
  {
    ...platedHoleBase,
    shape: "oval",
    outer_width: 2,
    outer_height: 1,
    hole_width: 0.6,
    hole_height: 0.3,
    ccw_rotation: 30,
  },
  {
    ...platedHoleBase,
    shape: "pill",
    outer_width: 1,
    outer_height: 2,
    hole_width: 0.3,
    hole_height: 0.6,
    ccw_rotation: 30,
  },
  {
    ...platedHoleBase,
    shape: "circular_hole_with_rect_pad",
    hole_shape: "circle",
    pad_shape: "rect",
    rect_pad_width: 1,
    rect_pad_height: 2,
    rect_border_radius: 0.2,
    rect_ccw_rotation: 30,
    hole_diameter: 0.3,
    hole_offset_x: 0.1,
    hole_offset_y: 0,
  },
  {
    ...platedHoleBase,
    shape: "pill_hole_with_rect_pad",
    hole_shape: "pill",
    pad_shape: "rect",
    rect_pad_width: 2,
    rect_pad_height: 1,
    rect_border_radius: 0.2,
    hole_width: 0.6,
    hole_height: 0.3,
    hole_offset_x: 0,
    hole_offset_y: 0.1,
  },
  {
    ...platedHoleBase,
    shape: "rotated_pill_hole_with_rect_pad",
    hole_shape: "rotated_pill",
    pad_shape: "rect",
    rect_pad_width: 1,
    rect_pad_height: 2,
    rect_border_radius: 0.2,
    rect_ccw_rotation: 30,
    hole_width: 0.3,
    hole_height: 0.6,
    hole_ccw_rotation: 60,
    hole_offset_x: 0.1,
    hole_offset_y: 0,
  },
]
