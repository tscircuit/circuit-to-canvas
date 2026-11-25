import { expect, test } from "bun:test"
import {
  MatchedPairBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("a matched differential pair is white with phase skew enabled", async () => {
  const circuitJson = renderBoard({ board: <MatchedPairBoard /> })
  const { canvas, pixelAt } = renderCanvas({
    circuitJson,
    options: { showDifferentialPairPhaseSkew: true },
  })

  expect(pixelAt({ x: 0, y: 0.6 })).toEqual([255, 255, 255, 255])
  expect(pixelAt({ x: 0, y: -0.6 })).toEqual([255, 255, 255, 255])
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
