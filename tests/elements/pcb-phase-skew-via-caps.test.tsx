import { expect, test } from "bun:test"
import {
  LayerChangeBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("round overlay caps extend beyond the via on each copper layer", () => {
  const circuitJson = renderBoard({ board: <LayerChangeBoard smallVias /> })
  const center = { x: 0, y: 0.6 }
  for (const [layer, direction] of [
    ["top_copper", 1],
    ["bottom_copper", -1],
  ] as const) {
    const { pixelAt } = renderCanvas({
      circuitJson,
      center,
      options: {
        showDifferentialPairPhaseSkew: true,
        phaseSkewFullScaleMm: 2,
        layers: [layer],
      },
    })
    expect(pixelAt({ x: direction * 0.115, y: center.y })).toEqual([
      139, 139, 255, 255,
    ])
    expect(pixelAt({ x: direction * 0.14, y: center.y })).toEqual([
      26, 26, 26, 255,
    ])
    expect(pixelAt(center)).toEqual([255, 38, 226, 255])
  }
})
