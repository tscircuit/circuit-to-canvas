import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit } from "./pcb-via-dark-center.fixture"

function render(
  layer: "top" | "bottom",
  drawSoldermask = true,
  maskColor?: string,
) {
  const canvas = createCanvas(1000, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -5, maxY: 5 })
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
  test(`${layer} view darkens only tented, unplugged via centers`, async () => {
    const original = structuredClone(circuit)
    const view = render(layer)
    const copper = render(layer, false)
    const isTop = layer === "top"
    const tentedX = isTop ? -7 : -3
    const pluggedX = isTop ? 3 : 7

    // Explicit per-side overrides take precedence over the owning board.
    expect(view.pixel(tentedX, 1.5)).not.toEqual(
      view.pixel(tentedX + 0.75, 1.5),
    )
    expect(view.pixel(pluggedX, 1.5)).toEqual(view.pixel(pluggedX + 0.75, 1.5))
    expect(view.pixel(isTop ? -3 : -7, 1.5)).toEqual(copper.pixel(-7, 1.5))
    expect(view.pixel(isTop ? 7 : 3, 1.5)).toEqual(copper.pixel(3, 1.5))

    // Route-only vias use the same appearance and their own board's plugging setting.
    expect(view.pixel(-7, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(3, -1.5)).toEqual(view.pixel(pluggedX, 1.5))

    // The exposed pad clips both the annular mask and the center shading.
    expect(view.pixel(-3.25, -1.5)).toEqual(copper.pixel(-3.25, -1.5))
    expect(view.pixel(-2.75, -1.5)).toEqual(view.pixel(tentedX, 1.5))
    expect(view.pixel(-2.25, -1.5)).toEqual(view.pixel(tentedX + 0.75, 1.5))
    expect(copper.pixel(tentedX, 1.5)).toEqual(copper.pixel(pluggedX, 1.5))
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
    const center = view.pixel(-7, 1.5)
    const ring = view.pixel(-6.25, 1.5)
    for (let channel = 0; channel < 3; channel++) {
      expect(
        Math.abs(center[channel]! - ring[channel]! / 2),
      ).toBeLessThanOrEqual(1)
    }
    expect(center[3]).toBe(255)
    expect(view.pixel(3, 1.5)).toEqual(ring)
  }
})

test("transparent mask colors do not add a dark center", () => {
  const view = render("top", true, "transparent")
  expect(view.pixel(-7, 1.5)).toEqual(view.pixel(3, 1.5))
  expect(view.pixel(-7, -1.5)).toEqual(view.pixel(3, -1.5))
})
