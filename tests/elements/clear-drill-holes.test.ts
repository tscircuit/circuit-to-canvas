import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const drillElements: AnyCircuitElement[] = [
  {
    type: "pcb_hole",
    pcb_hole_id: "hole",
    hole_shape: "circle",
    hole_diameter: 10,
    x: 20,
    y: 20,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "plated-hole",
    shape: "circle",
    outer_diameter: 12,
    hole_diameter: 6,
    x: 40,
    y: 20,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_via",
    pcb_via_id: "via",
    outer_diameter: 10,
    hole_diameter: 4,
    x: 60,
    y: 20,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout",
    shape: "circle",
    center: { x: 80, y: 20 },
    radius: 5,
  },
]

test("clearDrillHoles removes physical apertures and preserves copper rings", () => {
  const canvas = createCanvas(100, 40)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.drawElements(drillElements, { clearDrillHoles: true })

  const alphaAt = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3]

  expect(alphaAt(20, 20)).toBe(0)
  expect(alphaAt(40, 20)).toBe(0)
  expect(alphaAt(60, 20)).toBe(0)
  expect(alphaAt(80, 20)).toBe(0)
  expect(alphaAt(45, 20)).toBe(255)
  expect(alphaAt(64, 20)).toBe(255)
})

test("drills retain their configured color by default", () => {
  const canvas = createCanvas(100, 40)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.drawElements(drillElements)

  expect(ctx.getImageData(20, 20, 1, 1).data[3]).toBe(255)
  expect(ctx.getImageData(80, 20, 1, 1).data[3]).toBe(255)
})

test("clearDrillHoles preserves visible tenting for standalone and route vias", () => {
  const elements: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 50, y: 20 },
      width: 100,
      height: 40,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      default_via_tented_on_top: true,
      default_via_tented_on_bottom: false,
    },
    ...drillElements,
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [
        {
          route_type: "via",
          x: 10,
          y: 20,
          from_layer: "top",
          to_layer: "bottom",
          outer_diameter: 10,
          hole_diameter: 4,
        },
      ],
    },
  ]
  const canvas = createCanvas(100, 40)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  for (const side of ["top", "bottom"] as const) {
    for (const mask of [false, true]) {
      ctx.clearRect(0, 0, 100, 40)
      drawer.drawElements(elements, {
        layers: [`${side}_copper`],
        clearDrillHoles: true,
        drawSoldermask: mask,
        drawSoldermaskTop: side === "top",
        drawSoldermaskBottom: side === "bottom",
      })
      const alpha = mask && side === "top" ? 255 : 0
      expect(ctx.getImageData(60, 20, 1, 1).data[3]).toBe(alpha)
      expect(ctx.getImageData(10, 20, 1, 1).data[3]).toBe(alpha)
      expect(ctx.getImageData(40, 20, 1, 1).data[3]).toBe(0)
    }
  }
  // A pad opening still exposes the drill beneath an otherwise tented via.
  elements.push({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad",
    pcb_component_id: "component",
    shape: "rect",
    x: 60,
    y: 20,
    width: 12,
    height: 12,
    layer: "top",
  })
  ctx.clearRect(0, 0, 100, 40)
  drawer.drawElements(elements, { drawSoldermask: true, clearDrillHoles: true })
  expect(ctx.getImageData(60, 20, 1, 1).data[3]).toBe(0)
  expect(ctx.getImageData(10, 20, 1, 1).data[3]).toBe(255)
})
