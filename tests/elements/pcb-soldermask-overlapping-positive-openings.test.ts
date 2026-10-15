import { expect, test } from "bun:test"
import type { AnyCircuitElement, PcbSmtPad } from "circuit-json"
import {
  board,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

test("overlapping positive openings preserve neighboring copper in either order", async () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const drawBoardMaterial of [false, true]) {
      const left: PcbSmtPad = {
        type: "pcb_smtpad",
        pcb_smtpad_id: "left",
        shape: "circle",
        x: -0.6,
        y: 0,
        radius: 0.5,
        layer,
        is_covered_with_solder_mask: true,
        soldermask_margin: 0.3,
      }
      const neighbors: AnyCircuitElement[] = [
        { ...left, pcb_smtpad_id: "right", x: 0.6 },
        {
          type: "pcb_hole",
          pcb_hole_id: "right-hole",
          hole_shape: "circle",
          x: 0.6,
          y: 0,
          hole_diameter: 1,
          is_covered_with_solder_mask: true,
          soldermask_margin: 0.3,
        },
        {
          type: "pcb_plated_hole",
          pcb_plated_hole_id: "right-plated-hole",
          shape: "circle",
          x: 0.6,
          y: 0,
          hole_diameter: 0.3,
          outer_diameter: 1,
          layers: ["top", "bottom"],
          is_covered_with_solder_mask: true,
          soldermask_margin: 0.3,
        },
      ]
      for (const right of neighbors) {
        const forward = await renderPair({
          circuit: [board, left, right],
          layer,
          drawBoardMaterial,
        })
        const reverse = await renderPair({
          circuit: [board, right, left],
          layer,
          drawBoardMaterial,
        })
        for (const { canvas, reference } of [forward, reverse]) {
          // SVG 0.0.450 also covers neighboring copper with plated-hole borders.
          // Keep Canvas's correct copper there; compare the other cases to SVG.
          const images =
            right.type === "pcb_plated_hole" ? [canvas] : [canvas, reference]
          for (const image of images) {
            expect(materialAt({ canvas: image, x: -0.15 })).toBe("copper")
            expect(materialAt({ canvas: image, x: 0.15 })).toBe(
              right.type === "pcb_hole" ? "drill" : "copper",
            )
            expect(materialAt({ canvas: image, x: 0 })).toBe("substrate")
            expect(materialAt({ canvas: image, x: -1.5 })).toBe("mask")
          }
        }
        const forwardPixels = forward.canvas
          .getContext("2d")
          .getImageData(0, 0, 400, 400).data
        const reversePixels = reverse.canvas
          .getContext("2d")
          .getImageData(0, 0, 400, 400).data
        // Antialiased border intersections can differ by one rounding step.
        expect(
          forwardPixels.every(
            (channel, index) =>
              Math.abs(channel - (reversePixels[index] ?? 0)) <= 1,
          ),
        ).toBe(true)
      }
    }
  }
})
