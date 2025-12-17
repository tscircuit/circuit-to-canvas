import { expect, test } from "bun:test"
import { createCanvas } from "canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { circuitElements, calculateBounds } from "./helpers"

test("USB-C flashlight - plated holes only", async () => {
  const canvas = createCanvas(400, 600)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 400, 600)

  // Filter to board + plated holes + regular holes
  const elements = circuitElements.filter(
    (el) =>
      el.type === "pcb_board" ||
      el.type === "pcb_plated_hole" ||
      el.type === "pcb_hole",
  )
  const bounds = calculateBounds(elements)
  drawer.setCameraBounds(bounds)

  drawer.drawElements(elements)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
