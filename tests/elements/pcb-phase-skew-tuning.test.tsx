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

  // The 5.2 mm ramp reaches 0.1 mm of lag shortly after x = -10.
  expect(on.pixelAt({ x: -9.8, y: -0.6 })[1]).toBeWithin(65, 95)
  expect(on.pixelAt({ x: -8.7, y: -0.6 })).toEqual([255, 0, 0, 255])

  await expect(off.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-off",
  )
  await expect(on.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-on",
  )
})

test("the caller can change the full-color skew for both signs", () => {
  const circuitJson = renderBoard({ board: <LoadEndMeanderBoard /> })
  const { pixelAt } = renderCanvas({
    circuitJson,
    options: {
      showDifferentialPairPhaseSkew: true,
      differentialPairPhaseSkewFullScaleMm: 2,
    },
  })

  // The plateau is +1.82254 mm on the leading leg and -1.82254 mm on the lagging leg.
  expect(pixelAt({ x: 0, y: 0.6 })).toEqual([23, 23, 255, 255])
  expect(pixelAt({ x: 0, y: -0.6 })).toEqual([255, 23, 23, 255])
  expect(pixelAt({ x: 11.5, y: 0.6 })).toEqual([255, 255, 255, 255])
})
