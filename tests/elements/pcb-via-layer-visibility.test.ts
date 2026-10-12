import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { LayerRef, PcbRenderLayer } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuit, vias } from "../fixtures/via-layer-visibility"

test("via visibility across the four-layer stack and overview", async () => {
  const layers: (LayerRef | undefined)[] = [
    "top",
    "inner1",
    "inner2",
    "bottom",
    undefined,
  ]
  const stack = createCanvas(800, 1664)
  const ctx = stack.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, 800, 1664)
  let passing = true
  for (const [index, layer] of layers.entries()) {
    const view = createCanvas(800, 300)
    const viewCtx = view.getContext("2d")
    viewCtx.fillStyle = "#000"
    viewCtx.fillRect(0, 0, 800, 300)
    const drawer = new CircuitToCanvasDrawer(viewCtx)
    drawer.realToCanvasMat = { a: 50, b: 0, c: 0, d: -50, e: 400, f: 150 }
    drawer.drawElements(
      circuit.filter((e) => e.type !== "pcb_note_text"),
      {
        layers: layer ? [`${layer}_copper` as PcbRenderLayer] : undefined,
      },
    )
    // Sample the annulus and drill before annotations are added. A missing or
    // stray via must fail even if the PNG matcher's tolerance accepts it.
    for (const via of vias) {
      const x = 400 + via.x * 50
      const pixel = [...viewCtx.getImageData(x + 19, 150, 1, 1).data]
      const visible = pixel.slice(0, 3).some((channel) => channel !== 0)
      const expected = !layer || via.layers.includes(layer)
      passing &&= visible === expected
      expect(visible).toBe(expected)
      const drill = [...viewCtx.getImageData(x, 150, 1, 1).data]
      expect(drill.slice(0, 3).some((channel) => channel !== 0)).toBe(expected)
    }
    drawer.drawElements([
      ...circuit.filter((e) => e.type === "pcb_note_text"),
      {
        type: "pcb_note_text",
        pcb_note_text_id: "view_label",
        font: "tscircuit2024",
        layer: "top",
        anchor_position: { x: 0, y: 2.5 },
        anchor_alignment: "center",
        font_size: 0.45,
        text: `Copper view: ${layer ?? "all layers"}`,
      },
    ])
    ctx.drawImage(view, 0, 100 + index * 316)
  }
  ctx.fillStyle = "#141414"
  ctx.fillRect(0, 0, 800, 100)
  ctx.textAlign = "center"
  ctx.fillStyle = passing ? "#4ade80" : "#fb7185"
  ctx.font = "bold 26px sans-serif"
  ctx.fillText(`Repro: ${passing ? "PASSING" : "FAILING"}`, 400, 35)
  ctx.fillStyle = "#f4f4f4"
  ctx.font = "18px sans-serif"
  ctx.fillText(
    "PCB views must show vias only on their physical copper layers.",
    400,
    64,
  )
  ctx.fillStyle = "#a3a3a3"
  ctx.font = "14px sans-serif"
  ctx.fillText(
    "Compare the rendered vias with their listed layers in each view below.",
    400,
    86,
  )
  await expect(stack.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-via-layer-visibility",
  )
})
