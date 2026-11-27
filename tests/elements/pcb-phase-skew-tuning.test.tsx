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
  expect(on.pixelAt({ x: 0, y: 0.6 })).toEqual([23, 23, 255, 255])
  expect(on.pixelAt({ x: 0, y: -0.6 })).toEqual([255, 23, 23, 255])
  expect(on.pixelAt({ x: 11.5, y: 0.6 })).toEqual([255, 255, 255, 255])
  expect(on.pixelAt({ x: 11.5, y: -0.6 })).toEqual([255, 255, 255, 255])

  // Quarter points of the ramp toward red on the lagging trace.
  const earlyGreen = on.pixelAt({ x: -8.7, y: -0.6 })[1]
  const lateGreen = on.pixelAt({ x: -6.1, y: -0.6 })[1]
  expect(earlyGreen).toBeWithin(194, 201)
  expect(lateGreen).toBeWithin(77, 85)

  await expect(off.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-off",
  )
  await expect(on.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-on",
  )
})

test("phaseSkewColors overrides all three colors on a tuning bump", async () => {
  const circuitJson = renderBoard({ board: <LoadEndMeanderBoard /> })
  const { canvas, pixelAt } = renderCanvas({
    circuitJson,
    options: {
      showDifferentialPairPhaseSkew: true,
      phaseSkewFullScaleMm: 2,
      phaseSkewColors: {
        positive: "rgb(56, 189, 248)",
        negative: "#f59e0b",
        zero: "#696969",
      },
    },
  })

  // The plateau is at about 91% intensity on the 2 mm scale.
  expect(pixelAt({ x: 0, y: 0.6 })).toEqual([60, 182, 235, 255])
  expect(pixelAt({ x: 0, y: -0.6 })).toEqual([233, 153, 19, 255])
  expect(pixelAt({ x: 11.5, y: 0.6 })).toEqual([105, 105, 105, 255])

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-phase-skew-tuning-custom-palette",
  )
})
