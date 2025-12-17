import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuitElements, getPcbElements } from "./helpers"

test("USB-C flashlight - USB-C connector region zoom", async () => {
  const canvas = createCanvas(400, 300)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 300)

  const pcbElements = getPcbElements(circuitElements)

  // Zoom into USB-C connector region (bottom of board)
  drawer.setCameraBounds({
    minX: -6,
    maxX: 6,
    minY: -16,
    maxY: -6,
  })

  drawer.drawElements(pcbElements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
