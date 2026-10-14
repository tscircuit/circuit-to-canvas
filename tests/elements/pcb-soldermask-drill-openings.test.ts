import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type {
  AnyCircuitElement,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
} from "circuit-json"
import {
  applyToPoint,
  compose,
  identity,
  scale,
  translate,
} from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"
import { drawPcbHole } from "../../lib/drawer/elements/pcb-hole"
import { processHoleSoldermask } from "../../lib/drawer/elements/pcb-soldermask/hole"
import { drawPcbPlatedHole } from "../../lib/drawer/elements/pcb-plated-hole"
import { processPlatedHoleSoldermask } from "../../lib/drawer/elements/pcb-soldermask/plated-hole"

function createStrictContext(width: number, height: number) {
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

function render({
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
        const openingFirst = render({ elements: [opening, pad], layer })
        const padFirst = render({ elements: [pad, opening], layer })
        const drill = render({ elements: [opening], layer }).pixel()
        expect(openingFirst.pixel()).toEqual(drill)
        expect(padFirst.pixel()).toEqual(drill)
        expect(openingFirst.pixel(-0.9)).toEqual([52, 135, 73, 255])
        const copper = render({
          elements: [pad],
          layer,
          drawSoldermask: false,
        }).pixel(0.5)
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
    const ctx = createStrictContext(20, 20)
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
        const image = render({ elements: [covered], layer })
        expect(image.pixel()).toEqual([52, 135, 73, 255])
        // A collapsed opening must not reuse the board's previous path.
        expect(image.pixel(1.5, 1.5)).toEqual([12, 55, 33, 255])
        expect(
          render({ elements: [covered], layer, drawSoldermask: false }).pixel(),
        ).toEqual([255, 38, 226, 255])
        for (const flag of [false, undefined]) {
          expect(
            render({
              elements: [{ ...covered, is_covered_with_solder_mask: flag }],
              layer,
            }).pixel(),
          ).toEqual([255, 38, 226, 255])
        }
      }
    }
  })
}

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
const platedHoleShapes: PcbPlatedHole[] = [
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

for (const hole of platedHoleShapes) {
  for (const layer of ["top", "bottom"] as const) {
    const realToCanvasMat = compose(translate(100, 100), scale(100, -100))
    test(`${layer} plated ${hole.shape}: collapsed copper preserves the drill`, () => {
      const reference = createStrictContext(200, 200)
      drawPcbPlatedHole({
        ctx: reference,
        hole,
        realToCanvasMat,
        colorMap: {
          ...DEFAULT_PCB_COLOR_MAP,
          copper: { ...DEFAULT_PCB_COLOR_MAP.copper, [layer]: "transparent" },
        },
        layer,
      })
      const drillOnly = reference.getImageData(0, 0, 200, 200).data
      for (const margin of [-0.5, -0.75, -2]) {
        const ctx = createStrictContext(200, 200)
        drawPcbPlatedHole({
          ctx,
          hole: { ...hole, is_covered_with_solder_mask: true },
          realToCanvasMat,
          colorMap: DEFAULT_PCB_COLOR_MAP,
          soldermaskMargin: margin,
          drawSoldermask: true,
          layer,
        })
        expect(ctx.getImageData(0, 0, 200, 200).data).toEqual(drillOnly)
      }
    })

    test(`${layer} plated ${hole.shape}: collapsed mask openings leave no cutout`, () => {
      for (const margin of [-0.5, -0.75, -2]) {
        const ctx = createStrictContext(200, 200)
        // A collapsed opening must clear this path before destination-out.
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.rect(0, 0, 200, 200)
        ctx.fill()
        processPlatedHoleSoldermask({
          ctx,
          hole: {
            ...hole,
            is_covered_with_solder_mask: true,
            soldermask_margin: margin,
          },
          realToCanvasMat,
          soldermaskOverCopperColor: "green",
          substrateColor: "yellow",
          layer,
        })
        expect(Array.from(ctx.getImageData(100, 100, 1, 1).data)).toEqual([
          0, 128, 0, 255,
        ])
        expect(Array.from(ctx.getImageData(2, 2, 1, 1).data)).toEqual([
          255, 0, 0, 255,
        ])
        expect(
          ctx
            .getImageData(0, 0, 200, 200)
            .data.every((v, i) => i % 4 !== 3 || v === 255),
        ).toBe(true)
      }
    })

    test(`${layer} plated ${hole.shape}: collapsed openings render safely and obey coverage`, () => {
      const exposed = render({ elements: [hole], layer })
      for (const margin of [-0.5, -0.75, -2]) {
        const covered = {
          ...hole,
          is_covered_with_solder_mask: true,
          soldermask_margin: margin,
        }
        const image = render({ elements: [covered], layer })
        expect(image.pixel()).toEqual([52, 135, 73, 255])
        expect(image.pixel(1.5, 1.5)).toEqual([12, 55, 33, 255])
        expect(
          render({ elements: [covered], layer, drawSoldermask: false }).pixels,
        ).toEqual(
          render({ elements: [hole], layer, drawSoldermask: false }).pixels,
        )
        for (const flag of [false, undefined]) {
          expect(
            render({
              elements: [{ ...covered, is_covered_with_solder_mask: flag }],
              layer,
            }).pixels,
          ).toEqual(exposed.pixels)
        }
      }
    })
  }
}
