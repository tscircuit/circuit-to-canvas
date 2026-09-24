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
    drawer.setCameraBounds({ minX: -4.25, maxX: 4.25, minY: -1.5, maxY: 2 })
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
  const plug = [12, 55, 33, 255]
  const tented = [52, 135, 73, 255]
  const drill = [255, 38, 226, 255]
  for (const view of [top, bottom]) {
    expect(view.pixel(-2, 0.425)).toEqual(tented)
    expect(view.pixel(-2, -0.675)).toEqual(tented)
    expect(view.pixel(2, 0.425)).toEqual(drill)
    expect(view.pixel(2, -0.675)).toEqual(drill)
    expect(view.pixel(-1.775, 0.425)).toEqual(tented)
  }
  const untented = circuit.map((element) =>
    element.type === "pcb_board"
      ? {
          ...element,
          default_via_tented_on_top: false,
          default_via_tented_on_bottom: false,
        }
      : element,
  )
  for (const view of [
    render("top", { elements: untented }),
    render("bottom", { elements: untented }),
  ]) {
    expect(view.pixel(-2, 0.425)).toEqual(plug)
    expect(view.pixel(-2, -0.675)).toEqual(plug)
    expect(view.pixel(2, 0.425)).toEqual(drill)
    expect(view.pixel(-1.775, 0.425)).toEqual(view.pixel(2.225, 0.425))
  }
  expect(render("top", { drawSoldermask: false }).pixel(-2, 0.425)).toEqual(
    drill,
  )
  expect(render("bottom", { drawSoldermask: false }).pixel(-2, -0.675)).toEqual(
    drill,
  )
  const unspecified = untented.map((element) =>
    element.type === "pcb_board"
      ? { ...element, default_via_plugged: undefined }
      : element,
  )
  expect(render("top", { elements: unspecified }).pixel(-2, 0.425)).toEqual(
    drill,
  )
  const cleared = render("top", { clearDrillHoles: true })
  expect(cleared.pixel(-2, 0.425)).toEqual(tented)
  expect(cleared.pixel(-2, -0.675)).toEqual(tented)
  expect(cleared.pixel(2, 0.425)[3]).toBe(0)
  expect(circuit).toEqual(original)
  const snapshot = createCanvas(1700, 1400)
  snapshot.getContext("2d").drawImage(top.canvas, 0, 0)
  snapshot.getContext("2d").drawImage(bottom.canvas, 0, 700)
  await expect(snapshot.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
