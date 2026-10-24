import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbTrace } from "circuit-json"
import { identity } from "transformation-matrix"
import { drawPcbTrace } from "../../lib/drawer/elements/pcb-trace/pcb-trace"
import { processTraceSoldermask } from "../../lib/drawer/elements/pcb-soldermask/trace"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"

test("interpolated copper and soldermask use the same variable-width geometry", () => {
  const trace: PcbTrace = {
    type: "pcb_trace",
    pcb_trace_id: "interpolated",
    route_thickness_mode: "interpolated",
    route: [
      { route_type: "wire", x: 20, y: 50, width: 10, layer: "top" },
      { route_type: "wire", x: 80, y: 50, width: 30, layer: "top" },
    ],
  }
  for (const pass of ["copper", "soldermask"]) {
    const ctx = createCanvas(100, 100).getContext("2d")
    const shared = {
      ctx,
      trace,
      realToCanvasMat: identity(),
      vias: [],
      platedHoles: [],
    }
    if (pass === "copper")
      drawPcbTrace({ ...shared, colorMap: DEFAULT_PCB_COLOR_MAP })
    else
      processTraceSoldermask({
        ...shared,
        layer: "top",
        soldermaskOverCopperColor: "#00ff00",
      })
    // Half-widths at x=35 and x=65 are 7.5 and 12.5, respectively.
    expect(ctx.getImageData(35, 40, 1, 1).data[3]).toBe(0)
    expect(ctx.getImageData(65, 40, 1, 1).data[3]).toBe(255)
    // Shared polygons have flat ends, without an extra round-capped stroke.
    expect(ctx.getImageData(85, 50, 1, 1).data[3]).toBe(0)
  }
})
