import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbBoard, PcbVia, PcbViaInput } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("vias inherit board defaults unless per-side or legacy tenting overrides them", async () => {
  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board",
    center: { x: 75, y: 50 },
    width: 150,
    height: 100,
    num_layers: 2,
    thickness: 1.6,
    material: "fr4",
    default_via_tented_on_top: true,
    default_via_tented_on_bottom: false,
  }
  const inherited: PcbVia = {
    type: "pcb_via",
    pcb_via_id: "inherited",
    x: 25,
    y: 50,
    outer_diameter: 20,
    hole_diameter: 10,
    layers: ["top", "bottom"],
  }
  const overridden: PcbVia = {
    ...inherited,
    pcb_via_id: "overridden",
    x: 75,
    tented_on_top: false,
    tented_on_bottom: true,
  }
  const legacy: PcbVia & Pick<PcbViaInput, "is_tented"> = {
    ...inherited,
    pcb_via_id: "legacy",
    x: 125,
    is_tented: false,
  }
  const elements = [board, inherited, overridden, legacy]
  const canvas = createCanvas(150, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  const pixel = (x: number) => Array.from(ctx.getImageData(x, 50, 1, 1).data)
  drawer.drawElements(elements, {
    layers: ["top_copper"],
    drawSoldermask: true,
  })
  expect(pixel(25)).toEqual([52, 135, 73, 255])
  expect(pixel(75)).toEqual([255, 38, 226, 255])
  expect(pixel(125)).toEqual([255, 38, 226, 255])
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )

  ctx.clearRect(0, 0, 150, 100)
  drawer.drawElements(elements, {
    layers: ["bottom_copper"],
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
  })
  expect(pixel(25)).toEqual([255, 38, 226, 255])
  expect(pixel(75)).toEqual([52, 135, 73, 255])
  expect(pixel(125)).toEqual([255, 38, 226, 255])
  expect(inherited.tented_on_top).toBeUndefined()
  expect(inherited.tented_on_bottom).toBeUndefined()
})
