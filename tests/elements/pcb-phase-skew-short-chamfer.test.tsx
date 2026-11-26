import { expect, test } from "bun:test"
import {
  BendBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("a 0.099 mm chamfer retains its fade inside a 0.24 mm trace", () => {
  const circuitJson = renderBoard({
    board: (
      <BendBoard
        positivePath={[
          { x: 12, y: 0 },
          { x: 12.07, y: 0.07 },
          { x: 12.07, y: 0.7 },
          { x: 12.8, y: 0.7 },
          { x: 14, y: 0 },
        ]}
      />
    ),
  })
  const center = { x: 0.07, y: 0.67 }
  const overlay = renderCanvas({ circuitJson, center })
  const copper = renderCanvas({ circuitJson, center, options: {} })

  const outerCorner = { x: 0.17, y: 0.67 }
  expect(copper.pixelAt(outerCorner)).toEqual([200, 52, 52, 255])
  expect(overlay.pixelAt(outerCorner)).toEqual([180, 180, 255, 255])
  expect(overlay.pixelAt({ x: -0.04, y: 0.62 })).toEqual([255, 255, 255, 255])
  expect(overlay.pixelAt({ x: 0.04, y: 0.64 })[1]).toBeWithin(209, 215)
})
