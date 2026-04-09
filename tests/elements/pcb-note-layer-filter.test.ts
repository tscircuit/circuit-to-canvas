import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import type {
  AnyCircuitElement,
  PcbNoteDimension,
  PcbNoteLine,
  PcbNotePath,
  PcbNoteRect,
  PcbNoteText,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "../../lib/drawer"

const noteRect: PcbNoteRect = {
  type: "pcb_note_rect",
  pcb_note_rect_id: "note_rect1",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note Rect",
  text: "Layer filter test",
  center: { x: 0, y: 0 },
  width: 4,
  height: 2,
  stroke_width: 0.1,
  is_filled: true,
  has_stroke: true,
  color: "#00FFFF",
}

const noteText: PcbNoteText = {
  type: "pcb_note_text",
  pcb_note_text_id: "note_text1",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note Text",
  text: "Hello",
  font: "tscircuit2024",
  font_size: 1,
  anchor_position: { x: 0, y: 0 },
  anchor_alignment: "center",
  color: "#FF0000",
}

const noteLine: PcbNoteLine = {
  type: "pcb_note_line",
  pcb_note_line_id: "note_line1",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note Line",
  x1: -2,
  y1: -1,
  x2: 2,
  y2: 1,
  stroke_width: 0.1,
  color: "#00FF00",
}

const notePath: PcbNotePath = {
  type: "pcb_note_path",
  pcb_note_path_id: "note_path1",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note Path",
  route: [
    { x: -2, y: 0 },
    { x: 0, y: 2 },
    { x: 2, y: 0 },
  ],
  stroke_width: 0.1,
  color: "#0000FF",
}

const noteDimension: PcbNoteDimension = {
  type: "pcb_note_dimension",
  pcb_note_dimension_id: "note_dim1",
  pcb_component_id: "component1",
  pcb_group_id: "group1",
  subcircuit_id: "subcircuit1",
  name: "Test Note Dimension",
  from: { x: -2, y: 0 },
  to: { x: 2, y: 0 },
  font: "tscircuit2024",
  font_size: 0.5,
  arrow_size: 0.3,
  color: "#FFFF00",
}

const allNoteElements: AnyCircuitElement[] = [
  noteRect,
  noteText,
  noteLine,
  notePath,
  noteDimension,
]

function createBlankBuffer() {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)
  return canvas.toBuffer("image/png")
}

function drawWithOptions(
  elements: AnyCircuitElement[],
  options: Parameters<CircuitToCanvasDrawer["drawElements"]>[1] = {},
) {
  const canvas = createCanvas(200, 200)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, 200, 200)
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.setCameraBounds({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
  drawer.drawElements(elements, options)
  return canvas.toBuffer("image/png")
}

test("pcb_note_rect is excluded when layers are specified", () => {
  const buffer = drawWithOptions([noteRect], { layers: ["top_copper"] })
  expect(buffer).toEqual(createBlankBuffer())
})

test("pcb_note_text is excluded when layers are specified", () => {
  const buffer = drawWithOptions([noteText], { layers: ["top_copper"] })
  expect(buffer).toEqual(createBlankBuffer())
})

test("pcb_note_line is excluded when layers are specified", () => {
  const buffer = drawWithOptions([noteLine], { layers: ["top_copper"] })
  expect(buffer).toEqual(createBlankBuffer())
})

test("pcb_note_path is excluded when layers are specified", () => {
  const buffer = drawWithOptions([notePath], { layers: ["top_copper"] })
  expect(buffer).toEqual(createBlankBuffer())
})

test("pcb_note_dimension is excluded when layers are specified", () => {
  const buffer = drawWithOptions([noteDimension], { layers: ["top_copper"] })
  expect(buffer).toEqual(createBlankBuffer())
})

test("all pcb_note elements are excluded when layers are specified", () => {
  const buffer = drawWithOptions(allNoteElements, {
    layers: ["top_copper"],
  })
  expect(buffer).toEqual(createBlankBuffer())
})

test("all pcb_note elements are excluded for bottom layer too", () => {
  const buffer = drawWithOptions(allNoteElements, {
    layers: ["bottom_copper"],
  })
  expect(buffer).toEqual(createBlankBuffer())
})

test("pcb_note elements render when no layers are specified", () => {
  const buffer = drawWithOptions([noteRect])
  expect(buffer).not.toEqual(createBlankBuffer())
})

test("pcb_note elements render when no layers specified and showPcbNotes is true", () => {
  const buffer = drawWithOptions(allNoteElements, { showPcbNotes: true })
  expect(buffer).not.toEqual(createBlankBuffer())
})

test("pcb_note elements are hidden when showPcbNotes is false (no layers)", () => {
  const buffer = drawWithOptions(allNoteElements, { showPcbNotes: false })
  expect(buffer).toEqual(createBlankBuffer())
})
