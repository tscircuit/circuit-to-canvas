import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import {
  board,
  kinds,
  kindLabels,
  element,
  renderPair,
  label,
} from "../fixtures/soldermask-svg-behavior"

test("soldermask flag and margin comparison against published circuit-to-svg", async () => {
  const comparison = createCanvas(1440, 1120)
  const ctx = comparison.getContext("2d")
  ctx.fillStyle = "#171c22"
  ctx.fillRect(0, 0, comparison.width, comparison.height)
  label({
    ctx,
    text: "circuit-to-svg 0.0.450 (published)",
    x: 30,
    y: 38,
    fontSize: 24,
  })
  label({ ctx, text: "circuit-to-canvas", x: 750, y: 38, fontSize: 24 })
  for (const [column, margin] of [-0.25, 0, 0.25].entries()) {
    for (const offset of [0, 720])
      label({
        ctx,
        text: `${margin > 0 ? "+" : ""}${margin} mm`,
        x: offset + 230 + column * 160,
        y: 76,
      })
  }
  for (const [kindIndex, kind] of kinds.entries()) {
    for (const [flagIndex, covered] of [undefined, false, true].entries()) {
      const y = 95 + (kindIndex * 3 + flagIndex) * 110
      for (const offset of [0, 720]) {
        label({ ctx, text: kindLabels[kind], x: offset + 24, y: y + 40 })
        label({
          ctx,
          text: `flag: ${covered ?? "missing"}`,
          x: offset + 24,
          y: y + 66,
        })
      }
      for (const [column, margin] of [-0.25, 0, 0.25].entries()) {
        const item = {
          ...element(kind, "top"),
          soldermask_margin: margin,
          ...(covered === undefined
            ? {}
            : { is_covered_with_solder_mask: covered }),
        }
        const { canvas, reference } = await renderPair({
          circuit: [board, item],
          layer: "top",
        })
        const x = 210 + column * 160
        ctx.drawImage(reference, x, y, 100, 100)
        ctx.drawImage(canvas, x + 720, y, 100, 100)
      }
    }
  }
  label({
    ctx,
    text: "Same circuit JSON and soldermask behavior; each renderer keeps its own colors.",
    x: 24,
    y: 1105,
    fontSize: 15,
  })
  await expect(comparison.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})
