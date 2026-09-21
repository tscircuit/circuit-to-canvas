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
    expect(pixel(0.75, 0)).toEqual(pixel(0, 0))
    expect(pixel(1.35, 0)).toEqual(pixel(-2, 0))
    expect(pixel(1.1, 0)).toEqual(pixel(-2, 0))
    expect(pixel(0, 0)).not.toEqual(pixel(-2, 0))
    return canvas
  }

  const top = render("top")
  const bottom = render("bottom")
  render("top", circuit.toReversed())
  render("bottom", circuit.toReversed())
  const snapshot = createCanvas(800, 800)
  snapshot.getContext("2d").drawImage(top, 0, 0)
  snapshot.getContext("2d").drawImage(bottom, 0, 400)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
