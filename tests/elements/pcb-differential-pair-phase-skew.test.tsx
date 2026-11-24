import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getStackedPngSvgComparison } from "../fixtures/getStackedPngSvgComparison"
import {
  LayerChangeBoard,
  LoadEndMeanderBoard,
  LocalCompensationBoard,
  MatchedPairBoard,
  renderBoard,
} from "../fixtures/phase-skew/example-boards.fixture"
import { renderForumExampleBoard } from "../fixtures/phase-skew/forum-example-board.fixture"

const boards = [
  {
    name: "matched-pair",
    label: "Matched pair",
    observation: "both traces stay white",
    render: () => renderBoard(<MatchedPairBoard />),
    width: 28,
    height: 8,
  },
  {
    name: "load-end-meander",
    label: "Load-end meander",
    observation: "opposite signs return to white near the load",
    render: () => renderBoard(<LoadEndMeanderBoard />),
    width: 28,
    height: 9,
  },
  {
    name: "local-compensation",
    label: "Local compensation",
    observation: "the upper pair returns to white first",
    render: () => renderBoard(<LocalCompensationBoard />),
    width: 28,
    height: 11,
  },
  {
    name: "layer-change",
    label: "Layer change",
    observation: "skew crosses layers and drills stay visible",
    render: () => renderBoard(<LayerChangeBoard />),
    width: 28,
    height: 9,
  },
  {
    name: "kicad-forum",
    label: "KiCad forum example",
    observation: "skew follows the routed tuning bumps",
    render: renderForumExampleBoard,
    width: 22,
    height: 12,
  },
]

for (const { name, label, observation, render, width, height } of boards) {
  test(`differential pair phase skew: ${label}`, async () => {
    const circuitJson = render()
    const svg = convertCircuitJsonToPcbSvg(circuitJson, {
      showDifferentialPairPhaseSkew: true,
    })
    const colors = [
      ...svg.matchAll(
        /<path[^>]*data-type="pcb_differential_pair_phase_skew"[^>]*>/g,
      ),
    ].map(([path]) => path.match(/stroke="([^"]+)"/)?.[1])
    expect(colors).toContain("rgb(255, 255, 255)")
    if (name === "matched-pair") {
      expect(new Set(colors)).toEqual(new Set(["rgb(255, 255, 255)"]))
    } else {
      expect(colors).toContain("rgb(0, 0, 255)")
      expect(colors).toContain("rgb(255, 0, 0)")
    }

    const stacked = await getStackedPngSvgComparison(circuitJson, {
      width: 840,
      height: Math.round((840 * (height + 3)) / (width + 2)),
      viewport: {
        minX: -width / 2 - 1,
        maxX: width / 2 + 1,
        minY: -height / 2 - 1,
        maxY: height / 2 + 2,
      },
      showDifferentialPairPhaseSkew: true,
      svgFirst: true,
      title: `${label} - ${observation}`,
    })
    await expect(stacked).toMatchPngSnapshot(
      import.meta.path,
      `pcb-phase-skew-${name}-on`,
    )
  })
}
