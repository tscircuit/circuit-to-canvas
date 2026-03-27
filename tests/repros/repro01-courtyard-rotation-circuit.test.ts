import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import reproCircuit from "./assets/repro-circuit.json"

test("repro circuit rendering", async () => {
  const canvas = createCanvas(800, 800)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 800, 800)

  // Set camera to focus on the board
  drawer.setCameraBounds({ minX: -15, maxX: 15, minY: -15, maxY: 15 })
  drawer.drawElements(reproCircuit as any)

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
