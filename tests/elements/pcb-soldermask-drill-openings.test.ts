import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbHole, PcbSmtPad } from "circuit-json"
import { applyToPoint, identity } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"
import { drawPcbHole } from "../../lib/drawer/elements/pcb-hole"
import { processHoleSoldermask } from "../../lib/drawer/elements/pcb-soldermask/hole"

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

function render(
  elements: AnyCircuitElement[],
  layer: "top" | "bottom",
  drawSoldermask = true,
) {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
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

const openings: AnyCircuitElement[] = [
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

for (const layer of ["top", "bottom"] as const) {
  for (const opening of openings) {
    test(`${layer}: negative-margin pads preserve ${opening.type} in either order`, () => {
      const pads: PcbSmtPad[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "circle-pad",
          shape: "circle",
          radius: 1,
          layer,
          x: 0,
          y: 0,
          is_covered_with_solder_mask: true,
          soldermask_margin: -0.25,
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "mixed-margin-pad",
          shape: "rect",
          width: 2,
          height: 2,
          layer,
          x: 0,
          y: 0,
          is_covered_with_solder_mask: true,
          soldermask_margin_left: -0.25,
          soldermask_margin_right: 0.25,
          soldermask_margin_top: -0.25,
          soldermask_margin_bottom: 0.25,
        },
      ]
      for (const pad of pads) {
        const openingFirst = render([opening, pad], layer)
        const padFirst = render([pad, opening], layer)
        const drill = render([opening], layer).pixel()
        expect(openingFirst.pixel()).toEqual(drill)
        expect(padFirst.pixel()).toEqual(drill)
        expect(openingFirst.pixel(-0.9)).toEqual([52, 135, 73, 255])
        const copper = render([pad], layer, false).pixel(0.5)
        expect(openingFirst.pixel(0.5)).toEqual(copper)
        if (pad.shape === "rect") {
          expect(openingFirst.pixel(1.1)).toEqual(copper)
        }
        expect(openingFirst.pixels).toEqual(padFirst.pixels)
      }
    })
  }
}

const holeShapes: PcbHole[] = [
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

for (const hole of holeShapes) {
  test(`${hole.hole_shape}: collapsed openings use no invalid Canvas dimensions`, () => {
    const ctx = createCanvas(20, 20).getContext("2d")
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
    for (const margin of [-0.5, -0.75, -2]) {
      const covered = {
        ...hole,
        x: 10,
        y: 10,
        is_covered_with_solder_mask: true,
        soldermask_margin: margin,
      }
      ctx.clearRect(0, 0, 20, 20)
      drawPcbHole({
        ctx,
        hole: covered,
        realToCanvasMat: identity(),
        colorMap: DEFAULT_PCB_COLOR_MAP,
        soldermaskMargin: margin,
        drawSoldermask: true,
      })
      expect(ctx.getImageData(0, 0, 20, 20).data.every((v) => v === 0)).toBe(
        true,
      )

      // Leave a path outside the hole to catch stale-path cuts on early return.
      ctx.fillStyle = "red"
      ctx.beginPath()
      ctx.rect(0, 0, 5, 5)
      ctx.fill()
      processHoleSoldermask({
        ctx,
        hole: covered,
        realToCanvasMat: identity(),
        soldermaskOverCopperColor: "green",
        substrateColor: "yellow",
      })
      expect(Array.from(ctx.getImageData(2, 2, 1, 1).data)).toEqual([
        255, 0, 0, 255,
      ])
    }
  })

  test(`${hole.hole_shape}: collapsed negative-margin hole openings stay masked`, () => {
    for (const layer of ["top", "bottom"] as const) {
      for (const margin of [-0.5, -0.75, -2]) {
        const covered = {
          ...hole,
          is_covered_with_solder_mask: true,
          soldermask_margin: margin,
        }
        const image = render([covered], layer)
        expect(image.pixel()).toEqual([52, 135, 73, 255])
        // A collapsed opening must not reuse the board's previous path.
        expect(image.pixel(1.5, 1.5)).toEqual([12, 55, 33, 255])
        expect(render([covered], layer, false).pixel()).toEqual([
          255, 38, 226, 255,
        ])
        for (const flag of [false, undefined]) {
          expect(
            render(
              [{ ...covered, is_covered_with_solder_mask: flag }],
              layer,
            ).pixel(),
          ).toEqual([255, 38, 226, 255])
        }
      }
    }
  })
}
