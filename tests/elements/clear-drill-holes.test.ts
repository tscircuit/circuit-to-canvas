import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { applyToPoint, identity } from "transformation-matrix"
import { drawText } from "../../lib/drawer/shapes/text"

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

test("clearDrillHoles snapshots show mask toggles, text overlap, and pad openings", async () => {
  const flags = [
    {},
    { tented_on_top: false, tented_on_bottom: false },
    { tented_on_top: false, tented_on_bottom: true },
    { tented_on_top: true, tented_on_bottom: true },
  ]
  const circuit: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 48, y: 18 },
      width: 96,
      height: 36,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      default_via_tented_on_top: true,
      default_via_tented_on_bottom: false,
    },
  ]
  for (const [column, tenting] of flags.entries()) {
    const x = 12 + column * 24
    for (const y of [28, 8]) {
      circuit.push({
        type: "pcb_via",
        pcb_via_id: `via_${column}_${y}`,
        x,
        y,
        hole_diameter: 2,
        outer_diameter: 4,
        layers: ["top", "bottom"],
        ...tenting,
      })
    }
    circuit.push({
      type: "pcb_trace",
      pcb_trace_id: `trace_${column}`,
      route: [
        { route_type: "wire", x: x - 4, y: 18, layer: "top", width: 0.6 },
        { route_type: "wire", x, y: 18, layer: "top", width: 0.6 },
        {
          route_type: "via",
          x,
          y: 18,
          from_layer: "top",
          to_layer: "bottom",
          hole_diameter: 2,
          outer_diameter: 4,
          ...tenting,
        },
        { route_type: "wire", x, y: 18, layer: "bottom", width: 0.6 },
        { route_type: "wire", x: x + 4, y: 18, layer: "bottom", width: 0.6 },
      ],
    })
    for (const side of ["top", "bottom"] as const) {
      circuit.push(
        {
          type: "pcb_silkscreen_text",
          pcb_silkscreen_text_id: `text_${column}_${side}`,
          pcb_component_id: "component",
          layer: side,
          text: "GND",
          anchor_position: { x, y: 28 },
          anchor_alignment: "center",
          font: "tscircuit2024",
          font_size: 1.5,
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: `pad_${column}_${side}`,
          pcb_component_id: "component",
          layer: side,
          shape: "rect",
          x,
          y: 8,
          width: 6,
          height: 4,
        },
      )
    }
  }

  for (const side of ["top", "bottom"] as const) {
    for (const drawSoldermask of [true, false]) {
      const board = createCanvas(960, 360)
      const ctx = board.getContext("2d")
      const drawer = new CircuitToCanvasDrawer(ctx)
      drawer.setCameraBounds({ minX: 0, maxX: 96, minY: 0, maxY: 36 })
      drawer.drawElements(circuit, {
        layers: [`${side}_copper`, `${side}_silkscreen`],
        clearDrillHoles: true,
        drawSoldermask,
        drawSoldermaskTop: side === "top",
        drawSoldermaskBottom: side === "bottom",
      })
      for (const [column, tenting] of flags.entries()) {
        const tented =
          (side === "top" ? tenting.tented_on_top : tenting.tented_on_bottom) ??
          side === "top"
        for (const y of [18, 8]) {
          const [cx, cy] = applyToPoint(drawer.realToCanvasMat, [
            12 + column * 24,
            y,
          ])
          expect(ctx.getImageData(cx, cy, 1, 1).data[3]).toBe(
            y === 18 && drawSoldermask && tented ? 255 : 0,
          )
        }
      }

      const snapshot = createCanvas(960, 540)
      const overview = snapshot.getContext("2d")
      overview.fillStyle = "#e7edf1"
      overview.fillRect(0, 0, 960, 540)
      overview.drawImage(board, 0, 180)
      const label = (
        text: string,
        x: number,
        y: number,
        fontSize = 14,
        color = "#172c3b",
      ) =>
        drawText({
          ctx: overview,
          text,
          x,
          y,
          fontSize,
          color,
          realToCanvasMat: identity(),
          anchorAlignment: "center",
        })
      label(
        `${side} view / drawSoldermask = ${drawSoldermask} / clearDrillHoles = true`,
        480,
        24,
        20,
      )
      label(
        "default_via_tented_on_top = true / default_via_tented_on_bottom = false",
        480,
        54,
      )
      label("Light background shows transparent drill apertures", 480, 80)
      for (const [column, tenting] of flags.entries()) {
        label(
          `tented_on_top = ${tenting.tented_on_top ?? "unset"}`,
          120 + column * 240,
          115,
          12,
        )
        label(
          `tented_on_bottom = ${tenting.tented_on_bottom ?? "unset"}`,
          120 + column * 240,
          140,
          12,
        )
      }
      for (const [row, text] of [
        side === "top" && drawSoldermask
          ? "pcb_via + silkscreen GND"
          : "pcb_via",
        "pcb_trace.route via",
        "pcb_via + exposed pcb_smtpad",
      ].entries()) {
        label(
          text,
          480,
          205 + row * 100,
          14,
          drawSoldermask ? "white" : "#172c3b",
        )
      }
      await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
        import.meta.path,
        `clear-drill-holes-${side}-mask-${drawSoldermask}`,
      )
    }
  }
})
