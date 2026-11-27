import { expect, test } from "bun:test"
import {
  WidthChangeBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("the joint covers the wide copper where a trace narrows", () => {
  const circuitJson = renderBoard({ board: <WidthChangeBoard /> })
  const center = { x: 0, y: 0.6 }
  const overlay = renderCanvas({ circuitJson, center })
  const copper = renderCanvas({ circuitJson, center, options: {} })

  const wideEdge = { x: 0.1, y: 0.43 }
  expect(copper.pixelAt(wideEdge)).toEqual([200, 52, 52, 255])
  expect(overlay.pixelAt(wideEdge)).toEqual([221, 221, 255, 255])
  expect(overlay.pixelAt({ x: -0.06, y: 0.66 })[1]).toBeWithin(221, 228)
})
