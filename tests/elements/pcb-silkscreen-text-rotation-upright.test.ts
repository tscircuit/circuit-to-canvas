import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbSilkscreenText } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

// Silkscreen reference designators must stay readable no matter how their
// component is rotated. KiCad plots footprint text "keep upright": any angle
// that would render the text upside-down (past 90°) is flipped by 180°. So a
// label at 180° must render identically to one at 0°, and 270° identically to
// 90°. Before the fix, 180°/270° rendered upside-down.

const renderRotatedText = (
  ccw_rotation: number,
  layer: "top" | "bottom",
): Buffer => {
  const canvas = createCanvas(120, 120)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 120, 120)

  const text: PcbSilkscreenText = {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "text1",
    pcb_component_id: "component1",
    layer,
    text: "F",
    anchor_position: { x: 60, y: 60 },
    anchor_alignment: "center",
    font: "tscircuit2024",
    font_size: 16,
    ccw_rotation,
  }

  drawer.drawElements([text])
  return canvas.toBuffer("image/png")
}

const renderRotationStrip = (): Buffer => {
  const rotations = [0, 90, 180, 270]
  const canvas = createCanvas(480, 140)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 480, 140)

  // Each "F" is drawn at its rotation, with an unrotated number label below it
  // (its ccw_rotation) so the snapshot is self-documenting. Labels go through
  // the drawer too, so the whole image is deterministic across platforms.
  const texts: PcbSilkscreenText[] = rotations.flatMap((rot, i) => [
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `f${i}`,
      pcb_component_id: "component1",
      layer: "top",
      text: "F",
      anchor_position: { x: 60 + i * 120, y: 60 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 20,
      ccw_rotation: rot,
    },
    {
      type: "pcb_silkscreen_text",
      pcb_silkscreen_text_id: `label${i}`,
      pcb_component_id: "component1",
      layer: "top",
      text: `${rot}`,
      anchor_position: { x: 60 + i * 120, y: 115 },
      anchor_alignment: "center",
      font: "tscircuit2024",
      font_size: 10,
      ccw_rotation: 0,
    },
  ])

  drawer.drawElements(texts)

  return canvas.toBuffer("image/png")
}

test("silkscreen text stays upright when rotated (matches KiCad keep-upright)", async () => {
  // Visual before/after: F rendered at 0°, 90°, 180°, 270°.
  await expect(renderRotationStrip()).toMatchPngSnapshot(
    import.meta.path,
    "rotation-strip",
  )

  for (const layer of ["top", "bottom"] as const) {
    // 180° is the upside-down twin of 0° unless kept upright -> must match 0°.
    expect(
      renderRotatedText(180, layer).equals(renderRotatedText(0, layer)),
    ).toBe(true)
    // 270° is the upside-down twin of 90° unless kept upright -> must match 90°.
    expect(
      renderRotatedText(270, layer).equals(renderRotatedText(90, layer)),
    ).toBe(true)
  }
})
