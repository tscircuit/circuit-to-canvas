import { expect, test } from "bun:test"
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas"
import { Resvg } from "@resvg/resvg-js"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const viewport = { minX: -2, maxX: 2, minY: -2, maxY: 2 }
const board: AnyCircuitElement = {
  type: "pcb_board",
  pcb_board_id: "board",
  center: { x: 0, y: 0 },
  width: 4,
  height: 4,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}
const kinds = ["pad", "hole", "plated hole"] as const
type Kind = (typeof kinds)[number]

function element(
  kind: Kind,
  layer: "top" | "bottom",
): Extract<
  AnyCircuitElement,
  { type: "pcb_smtpad" | "pcb_hole" | "pcb_plated_hole" }
> {
  if (kind === "pad") {
    return {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "circle",
      layer,
      x: 0,
      y: 0,
      radius: 1,
    }
  }
  if (kind === "hole") {
    return {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "circle",
      x: 0,
      y: 0,
      hole_diameter: 2,
    }
  }
  return {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pth",
    shape: "circle",
    layers: ["top", "bottom"],
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 0.6,
  }
}

async function renderPair(
  circuit: AnyCircuitElement[],
  layer: "top" | "bottom",
  enabled = true,
  drawBoardMaterial = false,
) {
  const canvas = createCanvas(400, 400)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, 400, 400)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds(viewport)
  drawer.drawElements(circuit, {
    layers: [`${layer}_copper`],
    drawBoardMaterial,
    drawSoldermask: enabled,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })
  // The published SVG renderer receives exactly the same circuit JSON.
  // Never rewrite flags/margins or patch the reference renderer in this test.
  const svg = convertCircuitJsonToPcbSvg(circuit, {
    width: 400,
    height: 400,
    viewport,
    layer,
    showSolderMask: enabled,
    drawPaddingOutsideBoard: true,
    includeVersion: false,
    backgroundColor: "#000",
  })
  const reference = createCanvas(400, 400)
  reference
    .getContext("2d")
    .drawImage(
      await loadImage(
        new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng(),
      ),
      0,
      0,
    )
  return { canvas, reference }
}

function materialAt(canvas: Canvas, x: number, y = 0) {
  const [r = 0, g = 0, b = 0] = canvas
    .getContext("2d")
    .getImageData(
      Math.round(200 + x * 100),
      Math.round(200 - y * 100),
      1,
      1,
    ).data
  if (r > 240 && b > 200 && g < 80) return "drill"
  if (g > r && g > b) return "mask"
  if (r > 150 && g > 100 && b < 150) return "substrate"
  if (r > 150 && g < 100) return "copper"
  if (b > 150 && b > r) return "copper"
  return "background"
}

for (const layer of ["top", "bottom"] as const) {
  for (const kind of kinds) {
    for (const covered of [undefined, false, true]) {
      for (const margin of [-0.25, 0, 0.25]) {
        test(`${layer} ${kind}: coverage=${covered}, margin=${margin} matches SVG`, async () => {
          const item = {
            ...element(kind, layer),
            soldermask_margin: margin,
            ...(covered === undefined
              ? {}
              : { is_covered_with_solder_mask: covered }),
          }
          const { canvas, reference } = await renderPair([board, item], layer)
          const exposed = kind === "hole" ? "drill" : "copper"
          const fullyCovered =
            kind === "pad" && covered === true && margin === 0
          const expectedEdge =
            (covered === true && margin < 0) || fullyCovered ? "mask" : exposed
          const expectedOutside =
            covered === true && margin > 0 ? "substrate" : "mask"
          for (const image of [reference, canvas]) {
            expect(materialAt(image, 0.9)).toBe(expectedEdge)
            expect(materialAt(image, 1.1)).toBe(expectedOutside)
            expect(materialAt(image, 0)).toBe(
              kind === "pad" ? (fullyCovered ? "mask" : "copper") : "drill",
            )
          }
        })
      }
    }
    test(`${layer} ${kind}: disabling soldermask ignores coverage and margins`, async () => {
      const item = {
        ...element(kind, layer),
        is_covered_with_solder_mask: true,
        soldermask_margin: -0.25,
      }
      const { canvas, reference } = await renderPair(
        [board, item],
        layer,
        false,
      )
      for (const image of [reference, canvas]) {
        expect(materialAt(image, 0.9)).toBe(
          kind === "hole" ? "drill" : "copper",
        )
      }
    })
  }
}

for (const kind of kinds) {
  test(`${kind}: positive margin shows substrate when board material is hidden`, async () => {
    const item = {
      ...element(kind, "top"),
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.25,
    }
    const { canvas, reference } = await renderPair(
      [board, item],
      "top",
      true,
      false,
    )
    expect(materialAt(canvas, 1.1)).toBe("substrate")
    expect(materialAt(reference, 1.1)).toBe("substrate")
  })
}

test("base board mask and covered copper use SVG's opacity and colors", async () => {
  const { canvas, reference } = await renderPair(
    [board, { ...element("pad", "top"), is_covered_with_solder_mask: true }],
    "top",
  )
  for (const x of [200, 340]) {
    const actual = canvas.getContext("2d").getImageData(x, 200, 1, 1).data
    const expected = reference.getContext("2d").getImageData(x, 200, 1, 1).data
    for (let channel = 0; channel < 4; channel++)
      expect(
        Math.abs(actual[channel]! - expected[channel]!),
      ).toBeLessThanOrEqual(1)
  }
})

test("asymmetric rectangular margins obey coverage and explicit zero overrides", async () => {
  for (const covered of [undefined, false, true]) {
    const pad: AnyCircuitElement = {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rect",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      is_covered_with_solder_mask: covered,
      soldermask_margin_left: -0.25,
      soldermask_margin_right: 0.25,
      soldermask_margin_top: -0.25,
      soldermask_margin_bottom: 0.25,
    }
    const { canvas, reference } = await renderPair([board, pad], "top")
    for (const image of [reference, canvas]) {
      expect(materialAt(image, -0.9)).toBe(covered ? "mask" : "copper")
      expect(materialAt(image, 0, 0.9)).toBe(covered ? "mask" : "copper")
      // SVG's mixed-margin opening is copper, including its expanded sides.
      expect(materialAt(image, 1.1)).toBe(covered ? "copper" : "mask")
    }
  }
  const pad: AnyCircuitElement = {
    type: "pcb_smtpad",
    pcb_smtpad_id: "rect",
    shape: "rect",
    layer: "top",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    is_covered_with_solder_mask: true,
    soldermask_margin: 0.25,
    soldermask_margin_left: 0,
    soldermask_margin_right: 0,
    soldermask_margin_top: 0,
    soldermask_margin_bottom: 0,
  }
  const { canvas, reference } = await renderPair([board, pad], "top")
  for (const image of [reference, canvas])
    expect(materialAt(image, 0)).toBe("mask")
})

const shapeCases: Array<{ item: AnyCircuitElement; rotation?: number }> = [
  {
    item: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rect",
      shape: "rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      corner_radius: 0.3,
    },
  },
  {
    item: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated-rect",
      shape: "rotated_rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      corner_radius: 0.3,
      ccw_rotation: 30,
    },
    rotation: 30,
  },
  {
    item: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pill",
      shape: "pill",
      layer: "top",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      radius: 1,
    },
  },
  {
    item: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated-pill",
      shape: "rotated_pill",
      layer: "top",
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      radius: 1,
      ccw_rotation: 30,
    },
    rotation: 30,
  },
  {
    item: {
      type: "pcb_smtpad",
      pcb_smtpad_id: "polygon",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
    },
  },
  {
    item: {
      type: "pcb_hole",
      pcb_hole_id: "square",
      hole_shape: "square",
      x: 0,
      y: 0,
      hole_diameter: 2,
    },
  },
  {
    item: {
      type: "pcb_hole",
      pcb_hole_id: "oval",
      hole_shape: "oval",
      x: 0,
      y: 0,
      hole_width: 3,
      hole_height: 2,
    },
  },
  {
    item: {
      type: "pcb_hole",
      pcb_hole_id: "rect",
      hole_shape: "rect",
      x: 0,
      y: 0,
      hole_width: 3,
      hole_height: 2,
    },
  },
  {
    item: {
      type: "pcb_hole",
      pcb_hole_id: "pill",
      hole_shape: "pill",
      x: 0,
      y: 0,
      hole_width: 3,
      hole_height: 2,
    },
  },
  {
    item: {
      type: "pcb_hole",
      pcb_hole_id: "rotated-pill",
      hole_shape: "rotated_pill",
      x: 0,
      y: 0,
      hole_width: 3,
      hole_height: 2,
      ccw_rotation: 30,
    },
    rotation: 30,
  },
  {
    item: {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pill",
      ccw_rotation: 0,
      shape: "pill",
      x: 0,
      y: 0,
      outer_width: 3,
      outer_height: 2,
      hole_width: 1,
      hole_height: 0.6,
      layers: ["top", "bottom"],
    },
  },
  {
    item: {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "rect",
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_offset_x: 0,
      hole_offset_y: 0,
      x: 0,
      y: 0,
      rect_pad_width: 3,
      rect_pad_height: 2,
      rect_border_radius: 0.3,
      hole_diameter: 0.6,
      layers: ["top", "bottom"],
    },
  },
]
for (const { item, rotation = 0 } of shapeCases) {
  test(`${item.type} ${"shape" in item ? item.shape : "hole_shape" in item ? item.hole_shape : ""}: margin geometry matches SVG`, async () => {
    for (const covered of [undefined, false, true]) {
      for (const margin of [-0.25, 0, 0.25]) {
        const circuit = [
          board,
          {
            ...item,
            soldermask_margin: margin,
            ...(covered === undefined
              ? {}
              : { is_covered_with_solder_mask: covered }),
          },
        ]
        const { canvas, reference } = await renderPair(circuit, "top")
        for (const distance of [0.5, 0.9, 1.1, 1.4]) {
          const angle = (rotation * Math.PI) / 180
          const x = -distance * Math.sin(angle)
          const y = distance * Math.cos(angle)
          // SVG 0.0.450 omits rotation on positive rotated-hole cutouts.
          // Keep Canvas's correctly rotated opening instead of copying that bug.
          if (
            item.type === "pcb_hole" &&
            item.hole_shape === "rotated_pill" &&
            covered &&
            margin > 0
          ) {
            expect(materialAt(canvas, x, y)).toBe(
              distance < 1 ? "drill" : distance < 1.25 ? "substrate" : "mask",
            )
          } else {
            expect(materialAt(canvas, x, y)).toBe(materialAt(reference, x, y))
          }
        }
      }
    }
  })
}

test("positive margins expand rounded pad corner radii like SVG", async () => {
  for (const { item } of shapeCases.filter(
    ({ item }) =>
      "shape" in item &&
      (item.shape === "rect" || item.shape === "circular_hole_with_rect_pad"),
  )) {
    const pad = {
      ...item,
      is_covered_with_solder_mask: true,
      soldermask_margin: 0.25,
    }
    const { canvas, reference } = await renderPair([board, pad], "top")
    const x = item.type === "pcb_smtpad" ? 1.12 : 1.62
    expect(materialAt(reference, x, 1.12)).toBe("mask")
    expect(materialAt(canvas, x, 1.12)).toBe("mask")
  }
})

test("covered copper pours keep pad and hole margin openings", async () => {
  for (const kind of kinds) {
    const pour: AnyCircuitElement = {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "pour",
      shape: "rect",
      layer: "top",
      center: { x: 0, y: 0 },
      width: 4,
      height: 4,
      rotation: 0,
      covered_with_solder_mask: true,
    }
    const item = {
      ...element(kind, "top"),
      is_covered_with_solder_mask: true,
      soldermask_margin: -0.25,
    }
    const { canvas } = await renderPair([board, pour, item], "top")
    expect(materialAt(canvas, 0.9)).toBe("mask")
    expect(materialAt(canvas, 0.5)).toBe(kind === "hole" ? "drill" : "copper")
    expect(materialAt(canvas, 0)).toBe(kind === "pad" ? "copper" : "drill")
  }
})

test("soldermask flag and margin comparison against published circuit-to-svg", async () => {
  const comparison = createCanvas(1440, 1120)
  const ctx = comparison.getContext("2d")
  ctx.fillStyle = "#171c22"
  ctx.fillRect(0, 0, comparison.width, comparison.height)
  ctx.fillStyle = "white"
  ctx.font = "24px sans-serif"
  ctx.fillText("circuit-to-svg 0.0.450 (published)", 30, 38)
  ctx.fillText("circuit-to-canvas", 750, 38)
  ctx.font = "18px sans-serif"
  for (const [column, margin] of [-0.25, 0, 0.25].entries()) {
    for (const offset of [0, 720])
      ctx.fillText(
        `${margin > 0 ? "+" : ""}${margin} mm`,
        offset + 230 + column * 160,
        76,
      )
  }
  for (const [kindIndex, kind] of kinds.entries()) {
    for (const [flagIndex, covered] of [undefined, false, true].entries()) {
      const y = 95 + (kindIndex * 3 + flagIndex) * 110
      for (const offset of [0, 720]) {
        ctx.fillText(kind, offset + 24, y + 40)
        ctx.fillText(`flag: ${covered ?? "missing"}`, offset + 24, y + 66)
      }
      for (const [column, margin] of [-0.25, 0, 0.25].entries()) {
        const item = {
          ...element(kind, "top"),
          soldermask_margin: margin,
          ...(covered === undefined
            ? {}
            : { is_covered_with_solder_mask: covered }),
        }
        const { canvas, reference } = await renderPair([board, item], "top")
        const x = 210 + column * 160
        ctx.drawImage(reference, x, y, 100, 100)
        ctx.drawImage(canvas, x + 720, y, 100, 100)
      }
    }
  }
  ctx.font = "15px sans-serif"
  ctx.fillText(
    "Identical circuit JSON; soldermask enabled in both; no patched SVG reference.",
    24,
    1105,
  )
  await expect(comparison.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
