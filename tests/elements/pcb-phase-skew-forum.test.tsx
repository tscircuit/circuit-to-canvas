import { expect, test } from "bun:test"
import { renderForumExampleBoard } from "../fixtures/phase-skew/forum-example-board.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("renders phase skew on the KiCad forum board", async () => {
  const { canvas } = renderCanvas({
    circuitJson: renderForumExampleBoard(),
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
