import { expect, test } from "bun:test"
import {
  LayerChangeBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("the overlay follows copper layer visibility and leaves via drills visible", async () => {
  const circuitJson = renderBoard({ board: <LayerChangeBoard /> })
  const all = renderCanvas({ circuitJson })
  const top = renderCanvas({
    circuitJson,
    options: { showDifferentialPairPhaseSkew: true, layers: ["top_copper"] },
  })

  expect(top.pixelAt({ x: -2, y: 0.6 })).toEqual([0, 0, 255, 255])
  expect(all.pixelAt({ x: 2, y: 0.6 })).toEqual([0, 0, 255, 255])
  expect(top.pixelAt({ x: 2, y: 0.6 })).toEqual([26, 26, 26, 255])
  expect(top.pixelAt({ x: 0, y: 0.6 })).toEqual([255, 38, 226, 255])

  await expect(top.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
