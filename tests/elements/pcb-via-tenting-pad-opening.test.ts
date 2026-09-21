import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit } from "./pcb-via-tenting-pad-opening.fixture"

test("pad openings clip via tenting regardless of element order", async () => {
  function render(layer: "top" | "bottom", elements = circuit) {
    const canvas = createCanvas(800, 400)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.setCameraBounds({ minX: -4, maxX: 4, minY: -2, maxY: 2 })
    drawer.drawElements(
      elements.map((element) =>
        element.type === "pcb_note_text"
          ? { ...element, text: `${layer.toUpperCase()} VIEW\n${element.text}` }
          : element,
      ),
      {
        layers:
          layer === "top"
            ? ["top_copper", "top_user_note"]
            : ["bottom_copper", "top_user_note"],
        drawSoldermask: true,
        drawSoldermaskTop: layer === "top",
        drawSoldermaskBottom: layer === "bottom",
      },
    )
    function pixel(x: number, y: number) {
      const [cx, cy] = applyToPoint(drawer.realToCanvasMat, [x, y])
      return Array.from(
        ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data,
      )
    }
    return { canvas, pixel }
  }

  const top = render("top")
  const bottom = render("bottom")
  expect(top.pixel(0.75, 0)).toEqual(top.pixel(0, 0))
  expect(top.pixel(1.35, 0)).toEqual(top.pixel(-2, 0))
  expect(top.pixel(1.1, 0)).toEqual(top.pixel(-2, 0))
  expect(top.pixel(0, 0)).not.toEqual(top.pixel(-2, 0))
  expect(bottom.pixel(0.75, 0)).toEqual(bottom.pixel(0, 0))
  expect(bottom.pixel(1.35, 0)).toEqual(bottom.pixel(-2, 0))
  expect(bottom.pixel(1.1, 0)).toEqual(bottom.pixel(-2, 0))
  expect(bottom.pixel(0, 0)).not.toEqual(bottom.pixel(-2, 0))
  expect(render("top", circuit.toReversed()).pixel(0.75, 0)).toEqual(
    top.pixel(0.75, 0),
  )
  expect(render("bottom", circuit.toReversed()).pixel(0.75, 0)).toEqual(
    bottom.pixel(0.75, 0),
  )

  const exposedVia = render(
    "top",
    circuit.map((element) => {
      if (element.type === "pcb_smtpad")
        return { ...element, is_covered_with_solder_mask: true }
      if (element.type === "pcb_via")
        return { ...element, tented_on_top: false }
      return element
    }),
  )
  expect(exposedVia.pixel(0.95, 0)).toEqual([255, 38, 226, 255])

  const snapshot = createCanvas(800, 800)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 400)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
