import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbCopperPour } from "circuit-json"
import { CircuitToCanvasDrawer, drawText } from "../../lib/drawer"

test("draw copper pours with configurable opacity", async () => {
  const pours: PcbCopperPour[] = [
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "rect",
      shape: "rect",
      layer: "top",
      center: { x: 20, y: 50 },
      width: 20,
      height: 40,
      covered_with_solder_mask: false,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "polygon",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: 50, y: 30 },
        { x: 70, y: 30 },
        { x: 60, y: 70 },
      ],
      covered_with_solder_mask: false,
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "brep",
      shape: "brep",
      layer: "inner1",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 90, y: 30 },
            { x: 110, y: 30 },
            { x: 110, y: 70 },
            { x: 90, y: 70 },
          ],
        },
        inner_rings: [
          {
            vertices: [
              { x: 96, y: 44 },
              { x: 104, y: 44 },
              { x: 104, y: 56 },
              { x: 96, y: 56 },
            ],
          },
        ],
      },
      covered_with_solder_mask: false,
    },
  ]

  const comparison = createCanvas(960, 280)
  const comparisonCtx = comparison.getContext("2d")
  comparisonCtx.fillStyle = "#1a1a1a"
  comparisonCtx.fillRect(0, 0, 960, 280)
  for (let y = 40; y < 240; y += 20) {
    for (let x = 0; x < 960; x += 20) {
      comparisonCtx.fillStyle = (x / 20 + y / 20) % 2 ? "#303030" : "#242424"
      comparisonCtx.fillRect(x, y, 20, 20)
    }
  }

  const cases = [
    { label: "Default (0.5)", opacity: undefined, expectedAlpha: [127, 128] },
    { label: "Opacity 0", opacity: 0, expectedAlpha: [0] },
    { label: "Opacity 0.25", opacity: 0.25, expectedAlpha: [63, 64] },
    { label: "Opacity 1", opacity: 1, expectedAlpha: [255] },
  ]
  for (const [index, { label, opacity, expectedAlpha }] of cases.entries()) {
    const canvas = createCanvas(120, 100)
    const ctx = canvas.getContext("2d")
    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.drawElements(pours, { copperPourOpacity: opacity })

    for (const x of [20, 60, 92]) {
      expect(expectedAlpha).toContain(ctx.getImageData(x, 50, 1, 1).data[3]!)
    }
    expect(ctx.getImageData(100, 50, 1, 1).data[3]).toBe(0)
    expect(ctx.globalAlpha).toBe(1)

    const offsetX = index * 240
    comparisonCtx.drawImage(canvas, offsetX, 40, 240, 200)
    for (const [text, x, y, fontSize] of [
      [label, offsetX + 120, 20, 18],
      ["Rect", offsetX + 40, 250, 12],
      ["Polygon", offsetX + 120, 250, 12],
      ["BRep", offsetX + 200, 250, 12],
      ["top", offsetX + 40, 270, 12],
      ["bottom", offsetX + 120, 270, 12],
      ["inner1", offsetX + 200, 270, 12],
    ] as const) {
      drawText({
        ctx: comparisonCtx,
        text,
        x,
        y,
        fontSize,
        color: "#ffffff",
        realToCanvasMat: drawer.realToCanvasMat,
        anchorAlignment: "center",
      })
    }
  }

  await expect(comparison.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "copper-pour-opacity",
  )
})
