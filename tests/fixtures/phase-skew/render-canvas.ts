import { createCanvas, type Canvas } from "@napi-rs/canvas"
import type { CircuitJson, Point } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer, type DrawElementsOptions } from "../../../lib"

/** Renders a PNG-ready canvas and samples pixels in PCB coordinates. */
type RenderedCanvas = {
  canvas: Canvas
  pixelAt: (point: Point) => number[]
}

/** Draws a differential-pair fixture with phase skew enabled by default. */
export function renderCanvas({
  circuitJson,
  options = {
    showDifferentialPairPhaseSkew: true,
    phaseSkewFullScaleMm: 2,
  },
  center,
}: {
  circuitJson: CircuitJson
  options?: DrawElementsOptions
  center?: Point
}): RenderedCanvas {
  const canvas = createCanvas(840, 336)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // At 320 px/mm, the samples can distinguish a short chamfer from its caps.
  const jointPixelsPerMm = 320
  const halfWidthMm = canvas.width / (2 * jointPixelsPerMm)
  const halfHeightMm = canvas.height / (2 * jointPixelsPerMm)
  drawer.setCameraBounds(
    center === undefined
      ? { minX: -15, maxX: 15, minY: -6, maxY: 6 }
      : {
          minX: center.x - halfWidthMm,
          maxX: center.x + halfWidthMm,
          minY: center.y - halfHeightMm,
          maxY: center.y + halfHeightMm,
        },
  )
  drawer.drawElements(circuitJson, options)

  return {
    canvas,
    pixelAt(point) {
      const { x, y } = applyToPoint(drawer.realToCanvasMat, point)
      return Array.from(
        ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data,
      )
    },
  }
}
