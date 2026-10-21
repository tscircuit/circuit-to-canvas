import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { AnyCircuitElement, PcbHoleWithPolygonPad } from "circuit-json"
import { applyToPoint } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test.failing("polygon pads and offset drills at 0 and 90 degrees", async () => {
  const canvas = createCanvas(800, 480)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)
  const pad: PcbHoleWithPolygonPad = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "polygon_pad_0",
    shape: "hole_with_polygon_pad",
    x: -4,
    y: 0,
    hole_shape: "pill",
    hole_width: 1.5,
    hole_height: 0.6,
    hole_offset_x: 0.9,
    hole_offset_y: 0.1,
    pad_outline: [
      { x: -2, y: -0.75 },
      { x: 2, y: -0.75 },
      { x: 2, y: 1.25 },
      { x: -0.5, y: 1.25 },
      { x: -0.5, y: 0.75 },
      { x: -2, y: 0.75 },
    ],
    layers: ["top", "bottom"],
  }
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 18,
      height: 10,
      num_layers: 2,
      thickness: 1.6,
      material: "fr4",
    },
    pad,
    {
      ...pad,
      pcb_plated_hole_id: "polygon_pad_90",
      x: 4,
      ccw_rotation: 90,
    },
    ...[-4, 4].map(
      (x, index): AnyCircuitElement => ({
        type: "pcb_silkscreen_text",
        pcb_silkscreen_text_id: `rotation_label_${index}`,
        pcb_component_id: "component",
        text: index === 0 ? "0 degrees" : "90 degrees",
        anchor_position: { x, y: -3 },
        anchor_alignment: "center",
        font_size: 0.6,
        font: "tscircuit2024",
        layer: "top",
      }),
    ),
  ]
  const original = structuredClone(circuitJson)

  drawer.setCameraBounds({ minX: -10, maxX: 10, minY: -6, maxY: 6 })
  drawer.drawElements(circuitJson, {
    drawBoardMaterial: true,
    drawSoldermask: true,
  })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )

  const pixelAt = (x: number, y: number) => {
    const point = applyToPoint(drawer.realToCanvasMat, { x, y })
    return Array.from(
      ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data,
    )
  }

  expect(pixelAt(-5.5, 0)).toEqual([200, 52, 52, 255])
  expect(pixelAt(-3.1, 0.1)).toEqual([255, 38, 226, 255])
  expect(pixelAt(4, -1.5)).toEqual([200, 52, 52, 255])
  expect(pixelAt(5.5, 0)).toEqual([12, 55, 33, 255])
  expect(pixelAt(3.9, 0.9)).toEqual([255, 38, 226, 255])
  expect(pixelAt(3.9, 1.4)).toEqual([255, 38, 226, 255])
  expect(pixelAt(4.5, 0.1)).toEqual([200, 52, 52, 255])
  expect(circuitJson).toEqual(original)
})
