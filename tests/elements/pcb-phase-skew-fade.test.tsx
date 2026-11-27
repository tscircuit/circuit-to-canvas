import { expect, test } from "bun:test"
import { createCanvas } from "@napi-rs/canvas"
import { compose, scale, translate } from "transformation-matrix"
import { CircuitToCanvasDrawer } from "../../lib"
import { renderForumExampleBoard } from "../fixtures/phase-skew/forum-example-board.fixture"

const PIXELS_PER_MM = 248

test("renders the bends and zero crossing of the phase skew overlay", async () => {
  const board = renderForumExampleBoard()
  const canvas = createCanvas(1338, 966)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.realToCanvasMat = compose(
    translate(1838, 1030),
    scale(PIXELS_PER_MM, -PIXELS_PER_MM),
  )
  drawer.drawElements(board, { showDifferentialPairPhaseSkew: true })

  const skew = board.find(
    (element) => element.type === "pcb_differential_pair_phase_skew",
  )
  if (skew === undefined) throw new Error("Missing forum phase skew")
  // Centerline samples two pixels to either side, plus ten pixels upstream.
  const joints = [
    {
      trace: skew.positive_trace,
      index: 9,
      points: [
        [664, 370],
        [664, 366],
        [663, 378],
      ],
      incomingGreen: 220,
    },
    {
      trace: skew.negative_trace,
      index: 8,
      points: [
        [772, 448],
        [774, 445],
        [766, 454],
      ],
      incomingGreen: 248,
    },
  ] as const
  for (const { trace, index, points, incomingGreen } of joints) {
    const incoming = trace.segments[index]
    const outgoing = trace.segments[index + 1]
    if (incoming === undefined || outgoing === undefined)
      throw new Error("Missing forum joint")
    expect(incoming.end_length_difference_mm).toEqual(
      outgoing.start_length_difference_mm,
    )

    const [beforePoint, afterPoint, upstreamPoint] = points
    const before = ctx.getImageData(beforePoint[0], beforePoint[1], 1, 1).data
    const after = ctx.getImageData(afterPoint[0], afterPoint[1], 1, 1).data
    const upstream = ctx.getImageData(
      upstreamPoint[0],
      upstreamPoint[1],
      1,
      1,
    ).data
    const maxChannelDelta = Math.max(
      ...Array.from(before, (channel, i) => Math.abs(channel - after[i]!)),
    )
    expect(maxChannelDelta).toBeLessThanOrEqual(2)
    expect(Math.abs(upstream[1]! - incomingGreen)).toBeLessThanOrEqual(2)
  }

  const crops = [
    { left: 302, top: 622 }, // Entry bends
    { left: 691, top: 367 }, // Zero crossing
    { left: 904, top: 91 }, // Upper bends
  ]
  const cropWidth = 200
  const cropHeight = 210
  const gap = 8
  const sheet = createCanvas(crops.length * (cropWidth + gap) - gap, cropHeight)
  const sheetCtx = sheet.getContext("2d")
  crops.forEach(({ left, top }, index) => {
    sheetCtx.drawImage(
      canvas,
      left,
      top,
      cropWidth,
      cropHeight,
      index * (cropWidth + gap),
      0,
      cropWidth,
      cropHeight,
    )
  })

  await expect(sheet.toBuffer("image/png")).toMatchPngSnapshot(import.meta.path)
})
