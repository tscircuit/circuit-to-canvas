import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { compose, scale, translate } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib"
import { renderForumExampleBoard } from "../fixtures/phase-skew/forum-example-board.fixture"

test("renders the bends and zero crossing of the phase skew overlay", async () => {
  const board = renderForumExampleBoard()
  const pixelsPerMm = 248
  const canvas = createCanvas(1338, 966)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.realToCanvasMat = compose(
    translate(1838, 1030),
    scale(pixelsPerMm, -pixelsPerMm),
  )
  drawer.drawElements(board, { showDifferentialPairPhaseSkew: true })

  const crops = [
    { left: 302, top: 622 }, // Entry bends
    { left: 691, top: 367 }, // Zero crossing
    { left: 904, top: 91 }, // Upper bends
  ]
  const cropWidth = 200
  const cropHeight = 210
  const gap = 8
  const sheet = createCanvas(crops.length * (cropWidth + gap) - gap, cropHeight)
  const sheetCtx = sheet.getContext("2d")
  crops.forEach(({ left, top }, index) => {
    sheetCtx.drawImage(
      canvas,
      left,
      top,
      cropWidth,
      cropHeight,
      index * (cropWidth + gap),
      0,
      cropWidth,
      cropHeight,
    )
  })

  await expect(sheet.toBuffer("image/png")).toMatchPngSnapshot(import.meta.path)
})
