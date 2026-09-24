import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit } from "./pcb-via-plugging-overlap.fixture"

test("plugging preserves pad openings and overlapping silkscreen text on both faces", async () => {
  function render(layer: "top" | "bottom") {
    const canvas = createCanvas(1200, 720)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.configure({
      colorOverrides: { silkscreen: { top: "#fff", bottom: "#fff" } },
    })
    drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -6, maxY: 6 })
    drawer.drawElements(
      circuit.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "view"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - drawSoldermask: true`,
            }
          : element,
      ),
      {
        layers:
          layer === "top"
            ? ["top_copper", "top_silkscreen", "top_user_note"]
            : ["bottom_copper", "bottom_silkscreen", "top_user_note"],
        drawSoldermask: true,
        drawSoldermaskTop: layer === "top",
        drawSoldermaskBottom: layer === "bottom",
      },
    )
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
  const top = render("top")
  const bottom = render("bottom")
  for (const view of [top, bottom]) {
    expect(view.pixel(-5.1, -0.5)).toEqual([201, 162, 110, 255])
    expect(view.pixel(-5.7, -0.5)).toEqual(view.pixel(-6, -0.5))
    expect(view.pixel(5, -0.5)).toEqual([255, 255, 255, 255])
  }
  expect(top.pixel(-4.8, -0.5)).toEqual(top.pixel(-3.8, -0.5))
  expect(bottom.pixel(-4.8, -0.5)).toEqual([201, 162, 110, 255])
  expect(bottom.pixel(-3.8, -0.5)).toEqual(bottom.pixel(-6, -0.5))
  const snapshot = createCanvas(1200, 1440)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 720)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
