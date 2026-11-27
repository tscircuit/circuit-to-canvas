import { expect, test } from "bun:test"
import {
  PlatedHoleLayerChangeBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("the overlay is drawn over plated hole and via copper", async () => {
  const circuitJson = renderBoard({ board: <PlatedHoleLayerChangeBoard /> })
  const { canvas } = renderCanvas({ circuitJson })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
