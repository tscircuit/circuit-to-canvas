import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type { PcbBoard, PcbPlatedHole } from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

test("draw circular plated hole", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "circle",
    x: 50,
    y: 50,
    outer_diameter: 50,
    hole_diameter: 25,
    layers: ["top", "bottom"],
  }

  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 100,
    height: 100,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements([board, hole], { drawBoardMaterial: true })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
  )
})

test("draw oval plated hole", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "oval",
    x: 50,
    y: 50,
    outer_width: 60,
    outer_height: 40,
    hole_width: 40,
    hole_height: 20,
    layers: ["top", "bottom"],
    ccw_rotation: 0,
  }

  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 100,
    height: 100,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements([board, hole], { drawBoardMaterial: true })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "oval-plated-hole",
  )
})

test("draw pill plated hole", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "pill",
    x: 50,
    y: 50,
    outer_width: 70,
    outer_height: 35,
    hole_width: 50,
    hole_height: 20,
    layers: ["top", "bottom"],
    ccw_rotation: 0,
  }

  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 100,
    height: 100,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements([board, hole], { drawBoardMaterial: true })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "pill-plated-hole",
  )
})

test("draw circular hole with rotated rect pad", async () => {
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext("2d")
  const drawer = new CircuitToCanvasDrawer(ctx)

  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 100, 100)

  const hole: PcbPlatedHole & {
    rect_ccw_rotation?: number
    rect_border_radius?: number
  } = {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole1",
    shape: "circular_hole_with_rect_pad",
    x: 50,
    y: 50,
    hole_diameter: 25,
    rect_pad_width: 50,
    rect_pad_height: 70,
    rect_ccw_rotation: 45,
    layers: ["top", "bottom"],
  } as any

  const board: PcbBoard = {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 50, y: 50 },
    width: 100,
    height: 100,
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  }

  drawer.setCameraBounds({ minX: 0, maxX: 100, minY: 0, maxY: 100 })
  drawer.drawElements([board, hole], { drawBoardMaterial: true })

  await expect(canvas.toBuffer("image/png")).toMatchPngSnapshot(
    import.meta.path,
    "circular-hole-rotated-rect-pad",
  )
})
