import { expect, test } from "bun:test"
import {
  LoadEndMeanderBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("the opt-in overlay gradients leading and lagging traces in opposite colors", async () => {
  const circuitJson = renderBoard({ board: <LoadEndMeanderBoard /> })
  const off = renderCanvas({ circuitJson, options: {} })
  const on = renderCanvas({ circuitJson })

  expect(off.pixelAt({ x: 0, y: 0.6 })).toEqual([200, 52, 52, 255])
  expect(on.pixelAt({ x: 0, y: 0.6 })).toEqual([0, 0, 255, 255])
  expect(on.pixelAt({ x: 0, y: -0.6 })).toEqual([255, 0, 0, 255])
  expect(on.pixelAt({ x: 11.5, y: 0.6 })).toEqual([255, 255, 255, 255])
  expect(on.pixelAt({ x: 11.5, y: -0.6 })).toEqual([255, 255, 255, 255])

  // Quarter points on the lagging trace's white-to-red segment.
  const earlyGreen = on.pixelAt({ x: -8.7, y: -0.6 })[1]
  const lateGreen = on.pixelAt({ x: -6.1, y: -0.6 })[1]
  expect(earlyGreen).toBeWithin(185, 198)
  expect(lateGreen).toBeWithin(57, 70)

  await expect(off.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-off",
  )
  await expect(on.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-on",
  )
})
