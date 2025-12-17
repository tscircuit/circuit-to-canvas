import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuitElements, calculateBounds } from "./helpers"

test("USB-C flashlight - board only (without components)", async () => {
  const canvas = createCanvas(300, 500)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 300, 500)

  const boardOnly = circuitElements.filter((el) => el.type === "pcb_board")
  const bounds = calculateBounds(boardOnly)
  drawer.setCameraBounds(bounds)

  drawer.drawElements(boardOnly)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
