import { expect, test } from "bun:test"
import {
  board,
  renderPair,
  materialAt,
  shapeCases,
} from "../fixtures/soldermask-svg-behavior"

test("pad and hole margin geometry matches SVG", async () => {
  for (const { item, rotation = 0 } of shapeCases) {
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
        const { canvas, reference } = await renderPair({
          circuit,
          layer: "top",
        })
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
            expect(materialAt({ canvas, x, y })).toBe(
              distance < 1 ? "drill" : distance < 1.25 ? "substrate" : "mask",
            )
          } else {
            expect(materialAt({ canvas, x, y })).toBe(
              materialAt({ canvas: reference, x, y }),
            )
          }
        }
      }
    }
  }
})
