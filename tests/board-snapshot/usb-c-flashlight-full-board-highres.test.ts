import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuitElements, getPcbElements, calculateBounds } from "./helpers"

test("USB-C flashlight - full board render (high resolution)", async () => {
  const canvas = createCanvas(800, 1200)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 1200)

  const pcbElements = getPcbElements(circuitElements)
  const bounds = calculateBounds(pcbElements)
  drawer.setCameraBounds(bounds)

  drawer.drawElements(pcbElements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
