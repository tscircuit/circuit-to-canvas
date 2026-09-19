import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const text: PcbSilkscreenText = {
  type: "pcb_silkscreen_text",
  pcb_silkscreen_text_id: "text1",
  pcb_component_id: "component1",
  layer: "top",
  text: "U1",
  anchor_position: { x: 50, y: 50 },
  anchor_alignment: "center",
  font: "tscircuit2024",
  font_size: 8,
}

function renderTextHasVisiblePixels(
  silkscreenText: PcbSilkscreenText & { is_hidden?: boolean },
): boolean {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  drawer.drawElements([silkscreenText])

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  return pixels.some((channel, index) => index % 4 === 3 && channel !== 0)
}

test("draw silkscreen text", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  drawer.drawElements([text])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("hidden silkscreen text is not drawn", () => {
  expect(renderTextHasVisiblePixels({ ...text, is_hidden: true })).toBe(false)
})

test("silkscreen text remains visible when is_hidden is false or omitted", () => {
  expect(renderTextHasVisiblePixels({ ...text, is_hidden: false })).toBe(true)
  expect(renderTextHasVisiblePixels(text)).toBe(true)
})
