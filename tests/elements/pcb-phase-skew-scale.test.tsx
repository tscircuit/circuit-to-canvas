import { expect, test } from "bun:test"
import type { PcbDifferentialPairPhaseSkewSegment } from "circuit-json"
import type { DrawElementsOptions } from "../../lib"
import {
  getPhaseSkewColor,
  splitPhaseSkewSegmentAtFullScale,
} from "../../lib/drawer/elements/pcb-trace/get-phase-skew-strokes"
import {
  SkewRampBoard,
  TwoSkewRampPairsBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

// The first diagonal is 4 mm long and advances 2 mm in x.
const pointOnRamp = (fraction: number) => ({
  x: -4 + 2 * fraction,
  y: -0.6 - Math.sqrt(12) * fraction,
})

test("a ramp reaches full color at the requested scale and stays saturated", () => {
  const circuitJson = renderBoard({ board: <SkewRampBoard /> })
  const { pixelAt } = renderCanvas({
    circuitJson,
    options: { showDifferentialPairPhaseSkew: true, phaseSkewFullScaleMm: 1 },
  })

  expect(pixelAt({ x: -5, y: -0.6 })).toEqual([255, 255, 255, 255])
  const nearStart = pixelAt(pointOnRamp(0.05))
  expect(nearStart[0]).toBeWithin(226, 234)
  expect(nearStart[1]).toEqual(nearStart[0]!)
  expect(nearStart[2]).toEqual(255)
  expect(pixelAt(pointOnRamp(0.49))[0]).toBeWithin(1, 8)
  expect(pixelAt(pointOnRamp(0.5))).toEqual([0, 0, 255, 255])
  expect(pixelAt(pointOnRamp(0.75))).toEqual([0, 0, 255, 255])
})

test("the color scale is independent of the pair's max_length_skew", () => {
  const circuitJson = renderBoard({
    board: <SkewRampBoard maxLengthSkew={1} />,
  })

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

test("a mapped pair and a fallback pair use different scales on the same board", () => {
  const circuitJson = renderBoard({ board: <TwoSkewRampPairsBoard /> })
  const mappedBus = circuitJson
    .filter((element) => element.type === "source_bus")
    .find((bus) => bus.name === "MAPPED")
  if (!mappedBus) throw new Error("Missing source bus for the mapped pair")

  const { pixelAt } = renderCanvas({
    circuitJson,
    options: {
      showDifferentialPairPhaseSkew: true,
      phaseSkewFullScaleMm: 2,
      phaseSkewFullScaleMmBySourceBusId: { [mappedBus.source_bus_id]: 1 },
    },
  })
  const { x, y } = pointOnRamp(0.5)
  expect(pixelAt({ x, y: y + 2.5 })).toEqual([0, 0, 255, 255])
  const fallback = pixelAt({ x, y: y - 1.5 })
  expect(fallback[0]).toBeWithin(125, 130)
  expect(fallback.slice(1)).toEqual([fallback[0]!, 255, 255])
})

test("a zero full scale makes any nonzero skew fully saturated", () => {
  const circuitJson = renderBoard({ board: <SkewRampBoard /> })
  const { pixelAt } = renderCanvas({
    circuitJson,
    options: { showDifferentialPairPhaseSkew: true, phaseSkewFullScaleMm: 0 },
  })

  expect(pixelAt({ x: -4.1, y: 0.6 })).toEqual([255, 255, 255, 255])
  expect(pixelAt(pointOnRamp(0.02))).toEqual([0, 0, 255, 255])
  expect(pixelAt({ x: -3.9, y: 0.6 })).toEqual([255, 0, 0, 255])
})

test("a 0 to 2 mm segment splits at its midpoint on a 1 mm scale", () => {
  const segment: PcbDifferentialPairPhaseSkewSegment = {
    start: { x: 0, y: 0 },
    end: { x: 4, y: 2 },
    width: 0.24,
    layer: "top",
    start_length_difference_mm: 0,
    end_length_difference_mm: 2,
  }
  const fullScaleMm = 1
  const segments = splitPhaseSkewSegmentAtFullScale({ segment, fullScaleMm })
  const midpoint = { x: 2, y: 1 }
  expect(segments).toEqual([
    { ...segment, end: midpoint, end_length_difference_mm: 1 },
    { ...segment, start: midpoint, start_length_difference_mm: 1 },
  ])
  const saturated = segments[1]!
  for (const lengthDifferenceMm of [
    saturated.start_length_difference_mm,
    saturated.end_length_difference_mm,
  ]) {
    expect(getPhaseSkewColor({ lengthDifferenceMm, fullScaleMm })).toBe(
      "rgb(0, 0, 255)",
    )
  }
})

test.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
  "rejects a full scale of %s when enabled",
  (phaseSkewFullScaleMm) => {
    const options = {
      showDifferentialPairPhaseSkew: true,
      phaseSkewFullScaleMm,
    } as const
    expect(() => renderCanvas({ circuitJson: [], options })).toThrow(
      "phaseSkewFullScaleMm",
    )
  },
)

test.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
  "rejects a per-pair full scale of %s even when the pair is absent",
  (fullScaleMm) => {
    expect(() =>
      renderCanvas({
        circuitJson: [],
        options: {
          showDifferentialPairPhaseSkew: true,
          phaseSkewFullScaleMm: 2,
          phaseSkewFullScaleMmBySourceBusId: { missing: fullScaleMm },
        },
      }),
    ).toThrow("phaseSkewFullScaleMmBySourceBusId")
  },
)

test("requires full scale when enabled", () => {
  // @ts-expect-error Enabling the overlay requires a scale.
  const options: DrawElementsOptions = { showDifferentialPairPhaseSkew: true }
  expect(() => renderCanvas({ circuitJson: [], options })).toThrow(
    "phaseSkewFullScaleMm",
  )
})

test.each([[true], [false]])(
  "accepts a boolean overlay flag (%s) with an explicit full scale",
  (showDifferentialPairPhaseSkew: boolean) => {
    expect(() =>
      renderCanvas({
        circuitJson: [],
        options: { showDifferentialPairPhaseSkew, phaseSkewFullScaleMm: 2 },
      }),
    ).not.toThrow()
  },
)
