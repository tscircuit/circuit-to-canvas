import { collectTraceSegments } from "../../lib/drawer/elements/pcb-trace/collect-trace-segments"
import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { teardropDemo } from "../fixtures/teardrop-demo"
import type { PcbTrace } from "circuit-json"

function setup() {
  const canvas = createCanvas(720, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.realToCanvasMat = { a: 28, b: 0, c: 0, d: -28, e: 360, f: 300 }
  return { canvas, ctx, drawer }
}
test("teardrop profiles join pads, wires and vias on multiple layers", async () => {
  const { canvas, ctx, drawer } = setup()
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, 720, 600)
  drawer.drawElements(teardropDemo)
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
test("standalone taper renders and respects layer filtering and trace mode", () => {
  const trace = teardropDemo.find(
    (e) => e.type === "pcb_trace" && e.pcb_trace_id === "inner",
  ) as PcbTrace
  for (const mode of ["constant", "interpolated"] as const) {
    const { ctx, drawer } = setup()
    drawer.drawElements([{ ...trace, route_thickness_mode: mode }], {
      layers: ["top_copper"],
    })
    expect(ctx.getImageData(500, 468, 1, 1).data[3]).toBe(0)
    drawer.drawElements([{ ...trace, route_thickness_mode: mode }], {
      layers: ["inner1_copper"],
    })
    expect(ctx.getImageData(500, 468, 1, 1).data[3]).toBe(255)
    // Beyond the flat end cap remains empty.
    expect(ctx.getImageData(620, 468, 1, 1).data[3]).toBe(0)
  }
})

import { processTraceSoldermask } from "../../lib/drawer/elements/pcb-soldermask/trace"
import { drawPcbTrace } from "../../lib/drawer/elements/pcb-trace/pcb-trace"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"

test("soldermask includes standalone taper copper", () => {
  const { ctx, drawer } = setup()
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "mask",
    route: [
      {
        route_type: "wire",
        x: -6,
        y: 0,
        width: 2,
        ...{
          start_width: 2,
          end_width: 0.5,
          width_interpolation_mode: "linear",
        },
        layer: "top",
      },
      { route_type: "wire", x: 6, y: 0, width: 0.5, layer: "top" },
    ],
  }
  processTraceSoldermask({
    ctx,
    trace,
    realToCanvasMat: drawer.realToCanvasMat,
    soldermaskOverCopperColor: "#00ff00",
    layer: "top",
    vias: [],
    platedHoles: [],
  })
  expect([...ctx.getImageData(360, 300, 1, 1).data]).toEqual([0, 255, 0, 255])
  expect(ctx.getImageData(360, 330, 1, 1).data[3]).toBe(0)
})
test("standalone taper clears drills at both ends", () => {
  const { ctx, drawer } = setup()
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "drills",
    route: [
      {
        route_type: "wire",
        x: -6,
        y: 0,
        width: 2,
        ...{ start_width: 2, end_width: 1, width_interpolation_mode: "linear" },
        layer: "top",
      },
      { route_type: "wire", x: 6, y: 0, width: 1, layer: "top" },
    ],
  }
  drawPcbTrace({
    ctx,
    trace,
    realToCanvasMat: drawer.realToCanvasMat,
    colorMap: DEFAULT_PCB_COLOR_MAP,
    vias: [-6, 6].map((x) => ({
      type: "pcb_via",
      pcb_via_id: `via-${x}`,
      x,
      y: 0,
      layers: ["top"],
      outer_diameter: 2,
      hole_diameter: 0.7,
    })),
  })
  expect(ctx.getImageData(360, 300, 1, 1).data[3]).toBe(255)
  expect(ctx.getImageData(192, 300, 1, 1).data[3]).toBe(0)
  expect(ctx.getImageData(528, 300, 1, 1).data[3]).toBe(0)
})

test("ordinary segments before and after a taper are preserved without a duplicate stroke", () => {
  const tapered = {
    route_type: "wire" as const,
    x: 0,
    y: 0,
    width: 0.6,
    layer: "top" as const,
    start_width: 0.6,
    end_width: 0.2,
    width_interpolation_mode: "quadratic" as const,
  }
  const route: PcbTrace["route"] = [
    { route_type: "wire", x: -1, y: 0, width: 0.6, layer: "top" },
    tapered,
    { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
    { route_type: "wire", x: 2, y: 0, width: 0.2, layer: "top" },
  ]
  expect(collectTraceSegments(route).map((s) => s.map((p) => p.x))).toEqual([
    [-1, 0],
    [1, 2],
  ])
})
