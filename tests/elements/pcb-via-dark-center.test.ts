import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { DEFAULT_PCB_COLOR_MAP } from "../../lib/drawer/types"
import { circuit } from "./pcb-via-dark-center.fixture"

function render(
  layer: "top" | "bottom",
  drawSoldermask = true,
  maskColor?: string,
) {
  const canvas = createCanvas(600, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  if (maskColor) {
    drawer.configure({
      colorOverrides: {
        soldermaskOverCopper: { top: maskColor, bottom: maskColor },
      },
    })
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

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} view darkens only tented via centers`, async () => {
    const original = structuredClone(circuit)
    const view = render(layer)
    const copper = render(layer, false)
    const isTop = layer === "top"
    const tentedX = isTop ? -2 : 2

    // Explicit per-side overrides take precedence over the owning board.
    expect(view.pixel(tentedX, 1.5)).not.toEqual(
      view.pixel(tentedX + 0.75, 1.5),
    )
    expect(view.pixel(isTop ? 2 : -2, 1.5)).toEqual(copper.pixel(-2, 1.5))

    // Route-only vias use the same per-side tenting appearance.
    expect(view.pixel(-2, -1.5)).toEqual(view.pixel(tentedX, 1.5))

    // The exposed pad clips both the annular mask and the center shading.
    expect(view.pixel(1.75, -1.5)).toEqual(copper.pixel(1.75, -1.5))
    expect(view.pixel(2.25, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(2.75, -1.5)).toEqual(view.pixel(tentedX + 0.75, 1.5))
    expect(copper.pixel(-2, 1.5)).toEqual(copper.pixel(2, 1.5))
    expect(circuit).toEqual(original)
    await expect(view.canvas.toBuffer("image/png")).toMatchPngSnapshot(
      import.meta.path,
      `via-dark-center-${layer}`,
    )
  })
}

test("center shading follows custom mask colors", () => {
  for (const color of ["#80c0f0", "#ffffff", "#202020"]) {
    const view = render("top", true, color)
    const center = view.pixel(-2, 1.5)
    const ring = view.pixel(-1.25, 1.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
    expect(center[3]).toBe(255)
  }
})

test("transparent mask colors do not add a dark center", () => {
  const view = render("top", true, "transparent")
  const copper = render("top", false)
  const boardMask = view.pixel(0, 0)
  expect(view.pixel(-2, 1.5)).toEqual(boardMask)
  expect(view.pixel(-2, -1.5)).toEqual(copper.pixel(-2, -1.5))
})

for (const layer of ["top", "bottom"] as const) {
  test(`${layer} semi-transparent tenting preserves center alpha`, () => {
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
    expect(center[3]).toBe(ring[3])
    expect(Math.abs(center[3]! - 127.5)).toBeLessThanOrEqual(0.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
  })
}
