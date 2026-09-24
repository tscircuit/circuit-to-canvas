import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit } from "./pcb-via-board-plugging.fixture"

test("standalone and route vias use their own board's plugging setting", async () => {
  const original = structuredClone(circuit)
  function render(
    layer: "top" | "bottom",
    { drawSoldermask = true, clearDrillHoles = false, elements = circuit } = {},
  ) {
    const canvas = createCanvas(1700, 700)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.setCameraBounds({ minX: -17, maxX: 17, minY: -6, maxY: 8 })
    drawer.drawElements(
      elements.map((element) =>
        element.type === "pcb_note_text" && element.pcb_note_text_id === "view"
          ? {
              ...element,
              text: `${layer.toUpperCase()} VIEW - drawSoldermask: ${drawSoldermask}`,
            }
          : element,
      ),
      {
        layers:
          layer === "top"
            ? ["top_copper", "top_user_note"]
            : ["bottom_copper", "top_user_note"],
        drawSoldermask,
        drawSoldermaskTop: layer === "top",
        drawSoldermaskBottom: layer === "bottom",
        clearDrillHoles,
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
  const plug = [201, 162, 110, 255]
  const drill = [255, 38, 226, 255]
  for (const view of [top, bottom]) {
    expect(view.pixel(-8, 1.7)).toEqual(plug)
    expect(view.pixel(-8, -2.7)).toEqual(plug)
    expect(view.pixel(8, 1.7)).toEqual(drill)
    expect(view.pixel(8, -2.7)).toEqual(drill)
    expect(view.pixel(-7.1, 1.7)).toEqual(view.pixel(8.9, 1.7))
  }
  expect(render("top", { drawSoldermask: false }).pixel(-8, 1.7)).toEqual(drill)
  expect(render("bottom", { drawSoldermask: false }).pixel(-8, -2.7)).toEqual(
    drill,
  )
  const unspecified = circuit.map((element) =>
    element.type === "pcb_board"
      ? { ...element, default_via_plugged: undefined }
      : element,
  )
  expect(render("top", { elements: unspecified }).pixel(-8, 1.7)).toEqual(drill)
  const cleared = render("top", { clearDrillHoles: true })
  expect(cleared.pixel(-8, 1.7)).toEqual(plug)
  expect(cleared.pixel(-8, -2.7)).toEqual(plug)
  expect(cleared.pixel(8, 1.7)[3]).toBe(0)
  expect(circuit).toEqual(original)
  const snapshot = createCanvas(1700, 1400)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 700)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
