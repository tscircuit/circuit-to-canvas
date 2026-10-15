import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  board,
  kinds,
  element,
  renderPair,
  materialAt,
} from "../fixtures/soldermask-svg-behavior"

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
    const { canvas } = await renderPair({
      circuit: [board, pour, item],
      layer: "top",
    })
    expect(materialAt({ canvas, x: 0.9 })).toBe("mask")
    expect(materialAt({ canvas, x: 0.5 })).toBe(
      kind === "hole" ? "drill" : "copper",
    )
    expect(materialAt({ canvas, x: 0 })).toBe(
      kind === "pad" ? "copper" : "drill",
    )
  }
})
