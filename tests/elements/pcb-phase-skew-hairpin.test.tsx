import { expect, test } from "bun:test"
import {
  BendBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("a 170-degree bend covers the copper and preserves the neighboring fade", () => {
  const circuitJson = renderBoard({
    board: (
      <BendBoard
        positivePath={[
          { x: 11.8, y: 0 },
          { x: 11.935, y: 0.1 },
          { x: 12, y: 0.1 },
          { x: 11.75, y: 0.1441 },
          { x: 12, y: 0.33 },
          { x: 12.35, y: 0 },
        ]}
      />
    ),
  })
  const center = { x: 0, y: 0.7 }
  const overlay = renderCanvas({
    circuitJson,
    center,
    options: {
      showDifferentialPairPhaseSkew: true,
      differentialPairPhaseSkewFullScaleMm: 0.7,
    },
  })
  const copper = renderCanvas({ circuitJson, center, options: {} })

  const outerCorner = { x: 0.09, y: 0.64 }
  expect(copper.pixelAt(outerCorner)).toEqual([200, 52, 52, 255])
  expect(overlay.pixelAt(outerCorner)).toEqual([243, 243, 255, 255])
  expect(overlay.pixelAt({ x: -0.1, y: 0.85 })[1]).toBeWithin(137, 147)
})
