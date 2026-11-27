import { expect, test } from "bun:test"
import {
  SkewRampBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

// The first diagonal is 4 mm long and advances 2 mm in x.
const pointOnRamp = (fraction: number) => ({
  x: -4 + 2 * fraction,
  y: -0.6 - Math.sqrt(12) * fraction,
})

test("a ramp reaches full color at the pair's skew limit and stays saturated", () => {
  const circuitJson = renderBoard({
    board: <SkewRampBoard maxLengthSkew={1} />,
  })
  const { pixelAt } = renderCanvas({ circuitJson })

  expect(pixelAt({ x: -5, y: -0.6 })).toEqual([255, 255, 255, 255])
  const nearStart = pixelAt(pointOnRamp(0.05))
  expect(nearStart[0]).toBeWithin(226, 234)
  expect(nearStart[1]).toEqual(nearStart[0]!)
  expect(nearStart[2]).toEqual(255)
  expect(pixelAt(pointOnRamp(0.49))[0]).toBeWithin(1, 8)
  expect(pixelAt(pointOnRamp(0.5))).toEqual([0, 0, 255, 255])
  expect(pixelAt(pointOnRamp(0.75))).toEqual([0, 0, 255, 255])
})

test("a missing skew limit or bus uses the 2 mm fallback", () => {
  const circuitJson = renderBoard({ board: <SkewRampBoard /> })

  for (const elements of [
    circuitJson,
    circuitJson.filter((element) => element.type !== "source_bus"),
  ]) {
    const { pixelAt } = renderCanvas({ circuitJson: elements })
    const halfway = pixelAt(pointOnRamp(0.5))
    expect(halfway[0]).toBeWithin(125, 130)
    expect(halfway[1]).toEqual(halfway[0]!)
    expect(halfway[2]).toEqual(255)
    expect(pixelAt(pointOnRamp(1))).toEqual([0, 0, 255, 255])
  }
})

test("a zero skew limit makes any nonzero skew fully saturated", () => {
  const circuitJson = renderBoard({
    board: <SkewRampBoard maxLengthSkew={0} />,
  })
  const { pixelAt } = renderCanvas({ circuitJson })

  expect(pixelAt({ x: -4.1, y: 0.6 })).toEqual([255, 255, 255, 255])
  expect(pixelAt(pointOnRamp(0.02))).toEqual([0, 0, 255, 255])
  expect(pixelAt({ x: -3.9, y: 0.6 })).toEqual([255, 0, 0, 255])
})
