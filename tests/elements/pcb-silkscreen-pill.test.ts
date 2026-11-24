import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenPill } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw silkscreen pill", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  const pill: PcbSilkscreenPill = {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill1",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 200, y: 200 },
    width: 240,
    height: 80,
  }

  drawer.drawElements([pill])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("draw silkscreen pill bottom layer", async () => {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 400)

  const pill: PcbSilkscreenPill = {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "pill1",
    pcb_component_id: "component1",
    layer: "bottom",
    center: { x: 200, y: 200 },
    width: 160,
    height: 120,
  }

  drawer.drawElements([pill])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "silkscreen-pill-bottom",
  )
})

test("rotates silkscreen pill ccw_rotation around its center", () => {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)

  const pill: PcbSilkscreenPill = {
    type: "pcb_silkscreen_pill",
    pcb_silkscreen_pill_id: "rotated_pill",
    pcb_component_id: "component1",
    layer: "top",
    center: { x: 100, y: 100 },
    width: 120,
    height: 40,
    ccw_rotation: 90,
  }

  drawer.drawElements([pill])

  const image = ctx.getImageData(70, 20, 60, 50).data
  let inkedPixels = 0
  for (let index = 0; index < image.length; index += 4) {
    if (
      image[index] !== 0x1a ||
      image[index + 1] !== 0x1a ||
      image[index + 2] !== 0x1a
    ) {
      inkedPixels++
    }
  }

  expect(inkedPixels).toBeGreaterThan(0)
})
