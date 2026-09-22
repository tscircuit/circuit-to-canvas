import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit } from "./pcb-via-tenting-pad-opening.fixture"

test("pad openings clip via tenting regardless of element order", async () => {
  function render(layer: "top" | "bottom", elements = circuit) {
    const canvas = createCanvas(1200, 700)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -3.5, maxY: 3.5 })
    drawer.drawElements(
      elements.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "title"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - soldermask enabled\n${element.text}`,
            }
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
  expect(top.pixel(1.75, -0.5)).toEqual(top.pixel(1, -0.5))
  expect(top.pixel(2.35, -0.5)).toEqual(top.pixel(-3.5, -0.5))
  expect(top.pixel(2.1, -0.5)).toEqual(top.pixel(-3.5, -0.5))
  expect(top.pixel(1, -0.5)).not.toEqual(top.pixel(-3.5, -0.5))
  expect(bottom.pixel(1.75, -0.5)).toEqual(bottom.pixel(1, -0.5))
  expect(bottom.pixel(2.35, -0.5)).toEqual(bottom.pixel(-3.5, -0.5))
  expect(bottom.pixel(2.1, -0.5)).toEqual(bottom.pixel(-3.5, -0.5))
  expect(bottom.pixel(1, -0.5)).not.toEqual(bottom.pixel(-3.5, -0.5))
  expect(render("top", circuit.toReversed()).pixel(1.75, -0.5)).toEqual(
    top.pixel(1.75, -0.5),
  )
  expect(render("bottom", circuit.toReversed()).pixel(1.75, -0.5)).toEqual(
    bottom.pixel(1.75, -0.5),
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
  expect(exposedVia.pixel(1.95, -0.5)).toEqual([255, 38, 226, 255])

  const snapshot = createCanvas(1200, 1400)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 700)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
