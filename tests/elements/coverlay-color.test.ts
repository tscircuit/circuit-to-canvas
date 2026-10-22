import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { CircuitJson } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib"
import { createCoverlayCircuit } from "../fixtures/coverlay-circuit"

function renderCircuit(circuit: CircuitJson) {
  const canvas = createCanvas(600, 400)
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(circuit, { layers: ["top_copper"], drawSoldermask: true })
  return canvas.toBuffer("image/png")
}

test("yellow flex coverlay renders with exposed contacts and a substrate window", async () => {
  await expect(
    renderCircuit(createCoverlayCircuit("yellow")),
  ).toMatchPngSnapshot(import.meta.path, "yellow")
})

test("black flex coverlay renders with exposed contacts and a substrate window", async () => {
  await expect(
    renderCircuit(createCoverlayCircuit("black")),
  ).toMatchPngSnapshot(import.meta.path, "black")
})

test("white flex coverlay renders with exposed contacts and a substrate window", async () => {
  await expect(
    renderCircuit(createCoverlayCircuit("white")),
  ).toMatchPngSnapshot(import.meta.path, "white")
})

test("drawing rigid after flex does not retain coverlay colors", () => {
  const canvas = createCanvas(600, 400)
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(createCoverlayCircuit("white"), { drawSoldermask: true })
  const rigid = createCoverlayCircuit("black")
  rigid.find((e) => e.type === "pcb_board")!.material = "fr4"
  canvas.getContext("2d").clearRect(0, 0, 600, 400)
  drawer.drawElements(rigid, { layers: ["top_copper"], drawSoldermask: true })
  expect(canvas.toBuffer("image/png")).toEqual(renderCircuit(rigid))
})

test("coverlay apertures expose existing copper and substrate in all shapes", async () => {
  const circuit = createCoverlayCircuit("black")
  circuit.push(
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "circle",
      shape: "circle",
      layer: "top",
      x: -3,
      y: 2,
      radius: 0.7,
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "rotated",
      shape: "rotated_rect",
      layer: "top",
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      ccw_rotation: 45,
    },
    {
      type: "pcb_soldermask_opening",
      pcb_soldermask_opening_id: "polygon",
      shape: "polygon",
      layer: "top",
      points: [
        { x: 2, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 3 },
      ],
    },
  )
  const canvas = createCanvas(600, 400)
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(circuit, { layers: ["top_copper"], drawSoldermask: true })
  const ctx = canvas.getContext("2d")
  const substrate = ctx.getImageData(300, 300, 1, 1).data
  const copper = ctx.getImageData(300, 200, 1, 1).data
  expect(substrate[0]).toBeGreaterThan(100)
  expect(substrate[0]).toBeGreaterThan(substrate[1]!)
  expect(substrate[1]).toBeGreaterThan(substrate[2]!)
  expect(copper[0]).toBeGreaterThan(copper[1]! * 2)
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "coverlay-opening-shapes",
  )
})

test("bottom coverlay uses its own color and openings", async () => {
  const canvas = createCanvas(600, 400)
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(createCoverlayCircuit("white"), {
    layers: ["bottom_copper"],
    drawSoldermask: true,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: true,
  })
  expect([
    ...canvas.getContext("2d").getImageData(300, 300, 1, 1).data,
  ]).toEqual([255, 255, 255, 255])
  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "coverlay-bottom",
  )
})

test("explicit drawer colors take precedence over coverlay", () => {
  const canvas = createCanvas(600, 400)
  const drawer = new CircuitToCanvasDrawer(canvas)
  drawer.configure({
    colorOverrides: { soldermask: { top: "#ff00ff", bottom: "#ff00ff" } },
  })
  drawer.setCameraBounds({ minX: -6, maxX: 6, minY: -4, maxY: 4 })
  drawer.drawElements(createCoverlayCircuit("black"), { drawSoldermask: true })
  expect([...canvas.getContext("2d").getImageData(300, 50, 1, 1).data]).toEqual(
    [255, 0, 255, 255],
  )
})
