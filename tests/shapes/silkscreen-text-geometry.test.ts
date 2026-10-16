import { expect, test } from "bun:test"
import { getAlphabetLayout } from "../../lib/drawer/shapes/text/getAlphabetLayout"
import { getTextGeometry } from "../../lib/drawer/shapes/text/getTextStartPosition"

// Regression test for tscircuit/tscircuit#5542:
// "`pcb_silkscreen_text` geometry differs between Gerber output and PCB viewer"
//
// Reference numbers: circuit-json-to-gerber's renderVectorText draws each
// glyph at CAP_HEIGHT_SCALE = 0.7 x font_size (i.e. cap height, not the full
// em box) and anchors the *advance box* (width = sum of advances at full
// font size, height = 0.7 x font_size) on the anchor point. For "Q1" at
// font_size 1.7 with a center anchor that gives an advance box of
// x [-1.1765, +1.1765] (2 x 1.7 x 0.692049) by y [-0.595, +0.595]
// (1.7 x 0.7), and stroke-inclusive glyph ink of x [-1.185, +0.505],
// y [-0.756, +0.365] in Gerber's y-up frame (stroke diameter =
// font_size x 0.09 = 0.153).
//
// circuit-to-canvas used to draw glyphs at 1.0 x font_size and centre the
// *ink* bounds on the anchor, so the viewer text came out ~43% too tall and
// sat in the wrong place relative to the anchor.
//
// Note on frames: the canvas is y-down, Gerber is y-up. The ink bounds below
// are converted to the Gerber frame (gy = -cy) before comparing against the
// reference windows. The canvas x-max window is 0.56 rather than the Gerber
// stroke ink's 0.505 because circuit-to-canvas derives its bounds from the
// filled outline-polygon letterforms (slightly wider than the stroke
// skeleton the Gerber renderer uses) inset by half a stroke width; the
// positioning (advance box on the anchor) and the 0.7 glyph scale are what
// this test pins.

const FONT_SIZE = 1.7
const TEXT = "Q1"

test("silkscreen text anchors the advance box like the Gerber renderer", () => {
  const layout = getAlphabetLayout(TEXT, FONT_SIZE)

  // Glyph scale is the cap-height ratio, advances stay at full font size
  expect(layout.height).toBeCloseTo(FONT_SIZE * 0.7, 6)
  // lineHeight is untouched: it must keep matching the core solver
  expect(layout.lineHeight).toBeCloseTo(FONT_SIZE * 1.152, 6)

  const geometry = getTextGeometry("center", layout, FONT_SIZE)

  // The advance box sits centred on the anchor:
  // x [-1.1765, +1.1765], y [-0.595, +0.595]
  const boxMinX = geometry.startOffset.x
  const boxMaxX = geometry.startOffset.x + layout.width
  const boxMinY = geometry.startOffset.y
  const boxMaxY = geometry.startOffset.y + layout.height

  expect(boxMinX).toBeCloseTo(-1.1764833, 4)
  expect(boxMaxX).toBeCloseTo(1.1764833, 4)
  expect(boxMinY).toBeCloseTo(-0.595, 6)
  expect(boxMaxY).toBeCloseTo(0.595, 6)

  // The glyph ink lands where the Gerber reference puts it
  // (converted from canvas y-down to Gerber y-up).
  const ink = geometry.bounds
  expect(ink).not.toBeNull()
  const inkX = [ink!.minX, ink!.maxX]
  const inkY = [-ink!.maxY, -ink!.minY] // y-up Gerber frame

  expect(inkX[0]).toBeGreaterThanOrEqual(-1.185)
  expect(inkX[1]).toBeLessThanOrEqual(0.56)
  expect(inkY[0]).toBeGreaterThanOrEqual(-0.756)
  expect(inkY[1]).toBeLessThanOrEqual(0.365)
})
