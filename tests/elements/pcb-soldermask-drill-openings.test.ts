import { expect, test } from "bun:test"
import type { PcbSmtPad } from "circuit-json"
import { render, openings } from "../fixtures/soldermask-drill-openings"

test("negative-margin pads preserve drill openings in either order", () => {
  for (const layer of ["top", "bottom"] as const) {
    for (const opening of openings) {
      const pads: PcbSmtPad[] = [
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "circle-pad",
          shape: "circle",
          radius: 1,
          layer,
          x: 0,
          y: 0,
          is_covered_with_solder_mask: true,
          soldermask_margin: -0.25,
        },
        {
          type: "pcb_smtpad",
          pcb_smtpad_id: "mixed-margin-pad",
          shape: "rect",
          width: 2,
          height: 2,
          layer,
          x: 0,
          y: 0,
          is_covered_with_solder_mask: true,
          soldermask_margin_left: -0.25,
          soldermask_margin_right: 0.25,
          soldermask_margin_top: -0.25,
          soldermask_margin_bottom: 0.25,
        },
      ]
      for (const pad of pads) {
        const openingFirst = render({ elements: [opening, pad], layer })
        const padFirst = render({ elements: [pad, opening], layer })
        const drill = render({ elements: [opening], layer }).pixel()
        expect(openingFirst.pixel()).toEqual(drill)
        expect(padFirst.pixel()).toEqual(drill)
        expect(openingFirst.pixel(-0.9)).toEqual([52, 135, 73, 255])
        const copper = render({
          elements: [pad],
          layer,
          drawSoldermask: false,
        }).pixel(0.5)
        expect(openingFirst.pixel(0.5)).toEqual(copper)
        if (pad.shape === "rect") {
          expect(openingFirst.pixel(1.1)).toEqual(copper)
        }
        expect(openingFirst.pixels).toEqual(padFirst.pixels)
      }
    }
  }
})
