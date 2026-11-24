import { test, expect } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer, type DrawElementsOptions } from "../../lib"
import { getStackedPngSvgComparison } from "../fixtures/getStackedPngSvgComparison"
import {
  ConsecutiveViasBoard,
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

    for (const showDifferentialPairPhaseSkew of [false, true]) {
      const state = showDifferentialPairPhaseSkew ? "on" : "off"
      const stacked = await getStackedPngSvgComparison(circuitJson, {
        width: 840,
        height: Math.round((840 * (height + 3)) / (width + 2)),
        viewport: {
          minX: -width / 2 - 1,
          maxX: width / 2 + 1,
          minY: -height / 2 - 1,
          maxY: height / 2 + 2,
        },
        showDifferentialPairPhaseSkew,
        title: `${label} - ${showDifferentialPairPhaseSkew ? observation : "overlay off"}`,
      })
      await expect(stacked).toMatchPngSnapshot(
        import.meta.path,
        `pcb-phase-skew-${name}-${state}`,
      )
    }
  })
}

function renderCanvas(circuitJson: CircuitJson, options?: DrawElementsOptions) {
  const canvas = createCanvas(600, 240)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -15, maxX: 15, minY: -6, maxY: 6 })
  drawer.drawElements(circuitJson, options)
  return {
    png: () => canvas.toBuffer("image/png"),
    pixel(x: number, y: number) {
      const point = applyToPoint(drawer.realToCanvasMat, { x, y })
      return Array.from(
        ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data,
      )
    },
  }
}

test("Canvas phase skew is opt-in and a matched pair uses the zero colour", () => {
  const circuitJson = renderBoard(<MatchedPairBoard />)
  const off = renderCanvas(circuitJson, {
    showDifferentialPairPhaseSkew: false,
    phaseSkewColors: { zero: "#17a34a" },
  })
  expect(off.png()).toEqual(renderCanvas(circuitJson).png())
  expect(off.pixel(0, 0.6)).toEqual([200, 52, 52, 255])

  const on = renderCanvas(circuitJson, { showDifferentialPairPhaseSkew: true })
  expect(on.pixel(0, 0.6)).toEqual([255, 255, 255, 255])
  expect(on.pixel(0, -0.6)).toEqual([255, 255, 255, 255])

  const custom = renderCanvas(circuitJson, {
    showDifferentialPairPhaseSkew: true,
    phaseSkewColors: { zero: "#17a34a" },
  })
  expect(custom.pixel(0, 0.6)).toEqual([23, 163, 74, 255])
})

test("Canvas shows opposite phase skew signs after a detour", () => {
  const canvas = renderCanvas(renderBoard(<LoadEndMeanderBoard />), {
    showDifferentialPairPhaseSkew: true,
  })
  expect(canvas.pixel(0, 0.6)).toEqual([0, 0, 255, 255])
  expect(canvas.pixel(0, -0.6)).toEqual([255, 0, 0, 255])
  expect(canvas.pixel(11.5, 0.6)).toEqual([255, 255, 255, 255])
  expect(canvas.pixel(11.5, -0.6)).toEqual([255, 255, 255, 255])
})

test("Canvas confines skew to visible copper and keeps via drills above it", () => {
  const circuitJson = renderBoard(<LayerChangeBoard />)
  const top = renderCanvas(circuitJson, {
    showDifferentialPairPhaseSkew: true,
    layers: ["top_copper"],
  })
  const bottom = renderCanvas(circuitJson, {
    showDifferentialPairPhaseSkew: true,
    layers: ["bottom_copper"],
  })
  expect(top.pixel(-2, 0.6)).toEqual([0, 0, 255, 255])
  expect(top.pixel(2, 0.6)[3]).toBe(0)
  expect(bottom.pixel(-2, 0.6)[3]).toBe(0)
  expect(bottom.pixel(2, 0.6)).toEqual([0, 0, 255, 255])
  for (const view of [top, bottom]) {
    expect(view.pixel(0, 0.6)).toEqual([255, 38, 226, 255])
    expect(view.pixel(0, -0.6)).toEqual([255, 38, 226, 255])
  }
})

test("Canvas hides phase skew for traces excluded by the layer filter", () => {
  const circuitJson = renderBoard(<ConsecutiveViasBoard />)
  const full = renderCanvas(circuitJson, {
    showDifferentialPairPhaseSkew: true,
  })
  expect(full.pixel(0, 0.6)).toEqual([255, 255, 255, 255])

  const bottom: DrawElementsOptions = { layers: ["bottom_copper"] }
  const off = renderCanvas(circuitJson, bottom)
  const on = renderCanvas(circuitJson, {
    ...bottom,
    showDifferentialPairPhaseSkew: true,
  })
  expect(on.png().equals(off.png())).toBe(true)
})
