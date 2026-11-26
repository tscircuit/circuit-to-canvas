import { expect, test } from "bun:test"
import {
  EndToEndSkewBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderCanvas } from "../fixtures/phase-skew/render-canvas"

test("colors both full traces by the signed end-to-end skew", async () => {
  const legacyCircuitJson = renderBoard({ board: <EndToEndSkewBoard /> })
  const detourExtraMm = 2 * (Math.SQRT2 - 1)
  const totalsByName = new Map([
    ["MATCHED", 0],
    ["P_LONGER", detourExtraMm],
    ["N_LONGER", -detourExtraMm / 2],
  ])
  const sourceBuses = legacyCircuitJson.filter(
    (element) => element.type === "source_bus",
  )
  // The released core emits the skew records without the new total.
  const circuitJson = legacyCircuitJson.map((element) => {
    if (element.type !== "pcb_differential_pair_phase_skew") return element
    const pair = sourceBuses.find(
      (candidate) => candidate.source_bus_id === element.source_bus_id,
    )
    if (pair === undefined || pair.name === undefined)
      throw new Error("Missing source differential pair name")
    const total = totalsByName.get(pair.name)
    if (total === undefined) throw new Error(`Missing total for ${pair.name}`)
    return { ...element, end_to_end_length_difference_mm: total }
  })
  const options = { showDifferentialPairEndToEndSkew: true }
  const before = renderCanvas({ circuitJson })
  const after = renderCanvas({ circuitJson, options })
  const both = renderCanvas({
    circuitJson,
    options: { ...options, showDifferentialPairPhaseSkew: true },
  })
  const legacy = renderCanvas({ circuitJson: legacyCircuitJson, options })
  const top = renderCanvas({
    circuitJson,
    options: { ...options, layers: ["top_copper"] },
  })

  for (const [y, color] of [
    [3, [255, 255, 255, 255]],
    [0, [0, 0, 255, 255]],
    [-3, [255, 128, 128, 255]],
  ] as const) {
    for (const traceY of [y + 0.6, y - 0.6]) {
      for (const x of [-8, -3, 10]) {
        const point = { x, y: traceY }
        expect(after.pixelAt(point)).toEqual([...color])
        expect(both.pixelAt(point)).toEqual([...color])
      }
    }
  }
  expect(before.pixelAt({ x: -3, y: 3.6 })).toEqual([0, 0, 255, 255])
  expect(legacy.pixelAt({ x: -3, y: 3.6 })).toEqual([200, 52, 52, 255])
  const uncoupledFanout = { x: -10.6, y: 1.6 }
  expect(before.pixelAt(uncoupledFanout)).toEqual([200, 52, 52, 255])
  expect(after.pixelAt(uncoupledFanout)).toEqual([0, 0, 255, 255])
  expect(top.pixelAt({ x: 10, y: -2.4 })).toEqual([26, 26, 26, 255])

  await expect(before.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pcb-differential-pair-local-skew",
  )
  await expect(after.canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
