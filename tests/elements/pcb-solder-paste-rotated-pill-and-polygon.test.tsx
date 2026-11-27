import { expect, test } from "bun:test"
import { type Canvas, createCanvas } from "@napi-rs/canvas"
import { pcb_solder_paste } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { createSolderPasteBoardElements } from "../fixtures/solder-paste-board.fixture"

const BLACK = [0, 0, 0]
const SOLDER_PASTE_GRAY = [105, 105, 105]

function getRgbAt(
  ctx: ReturnType<Canvas["getContext"]>,
  point: { x: number; y: number },
): number[] {
  return Array.from(ctx.getImageData(point.x, point.y, 1, 1).data.slice(0, 3))
}

function worldToPixel(
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: Math.round(((worldX + 7) / 14) * 700),
    y: Math.round(((3 - worldY) / 6) * 300),
  }
}

test("renders rotated_pill and polygon (with holes) solder paste apertures", async () => {
  const elements = await createSolderPasteBoardElements()
  const canvas = createCanvas(700, 300)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "rgb(26, 26, 26)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawer.setCameraBounds({ minX: -7, maxX: 7, minY: -3, maxY: 3 })
  drawer.drawElements(elements, {
    layers: ["top_copper", "top_silkscreen"],
    drawBoardMaterial: true,
    drawSoldermask: true,
    drawSolderPaste: true,
  })

  expect(getRgbAt(ctx, worldToPixel(-4.74, 0.78))).toEqual(SOLDER_PASTE_GRAY)
  expect(getRgbAt(ctx, worldToPixel(-4.74 + 0.55, 0.78 + 0.38))).toEqual(
    SOLDER_PASTE_GRAY,
  )
  expect(getRgbAt(ctx, worldToPixel(-4.74 + 0.75, 0.78 - 0.15))).not.toEqual(
    SOLDER_PASTE_GRAY,
  )

  expect(getRgbAt(ctx, worldToPixel(0, 0))).toEqual(SOLDER_PASTE_GRAY)

  expect(getRgbAt(ctx, worldToPixel(3.4, 0))).toEqual(SOLDER_PASTE_GRAY)
  expect(getRgbAt(ctx, worldToPixel(4.2, 0))).not.toEqual(SOLDER_PASTE_GRAY)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("renders rotated_pill and polygon solder paste on bottom layer when enabled", () => {
  const bottomElements = [
    pcb_solder_paste.parse({
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "bot_rot_pill",
      shape: "rotated_pill",
      layer: "bottom",
      x: 40,
      y: 40,
      width: 28,
      height: 10,
      radius: 5,
      ccw_rotation: 90,
    }),
    pcb_solder_paste.parse({
      type: "pcb_solder_paste",
      pcb_solder_paste_id: "bot_poly",
      shape: "polygon",
      layer: "bottom",
      points: [
        { x: 90, y: 25 },
        { x: 130, y: 25 },
        { x: 130, y: 55 },
        { x: 90, y: 55 },
      ],
      holes: [
        [
          { x: 103, y: 34 },
          { x: 117, y: 34 },
          { x: 117, y: 46 },
          { x: 103, y: 46 },
        ],
      ],
    }),
  ]

  const canvas = createCanvas(160, 80)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  ctx.fillStyle = "rgb(0, 0, 0)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawer.drawElements(bottomElements, {
    drawSolderPaste: true,
    drawSolderPasteTop: false,
    drawSolderPasteBottom: true,
  })

  expect(getRgbAt(ctx, { x: 40, y: 40 })).toEqual(SOLDER_PASTE_GRAY)
  expect(getRgbAt(ctx, { x: 40, y: 50 })).toEqual(SOLDER_PASTE_GRAY)
  expect(getRgbAt(ctx, { x: 50, y: 40 })).toEqual(BLACK)
  expect(getRgbAt(ctx, { x: 96, y: 40 })).toEqual(SOLDER_PASTE_GRAY)
  expect(getRgbAt(ctx, { x: 110, y: 40 })).toEqual(BLACK)
})
