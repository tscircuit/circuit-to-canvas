import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { CircuitToCanvasDrawer } from "../../lib/drawer"
import { interpolatedBendRepro } from "../fixtures/interpolated-bend"

test("interpolated bends preserve the specified trace width", async () => {
  const canvas = createCanvas(960, 520)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -12, maxX: 12, minY: -6.5, maxY: 6.5 })
  drawer.drawElements(interpolatedBendRepro)
  // These samples lie 0.9mm from the centerlines, inside a 2mm-wide trace.
  expect(ctx.getImageData(260, 304, 1, 1).data[3]).toBe(255)
  expect(ctx.getImageData(284, 280, 1, 1).data[3]).toBe(255)
  expect(ctx.getImageData(740, 304, 1, 1).data[3]).toBe(255)
  expect(ctx.getImageData(764, 280, 1, 1).data[3]).toBe(255)
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
