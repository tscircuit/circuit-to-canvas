import type {
  AnyCircuitElement,
  PcbCopperPour,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  Ring,
} from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { CanvasContext } from "../../types"
import { drawCircle } from "../../shapes/circle"
import { drawOval } from "../../shapes/oval"
import { drawPill } from "../../shapes/pill"
import { drawPolygon } from "../../shapes/polygon"
import { drawRect } from "../../shapes/rect"

function computeArcFromBulge(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bulge: number,
): { centerX: number; centerY: number; radius: number } | null {
  if (Math.abs(bulge) < 1e-10) return null

  const chordX = endX - startX
  const chordY = endY - startY
  const chordLength = Math.hypot(chordX, chordY)
  if (chordLength < 1e-10) return null

  const sagitta = Math.abs(bulge) * (chordLength / 2)
  const halfChord = chordLength / 2
  const radius = (sagitta * sagitta + halfChord * halfChord) / (2 * sagitta)
  const distToCenter = radius - sagitta
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2
  const perpX = -chordY / chordLength
  const perpY = chordX / chordLength
  const sign = bulge > 0 ? -1 : 1

  return {
    centerX: midX + sign * perpX * distToCenter,
    centerY: midY + sign * perpY * distToCenter,
    radius,
  }
}

function drawArcFromBulge(
  ctx: CanvasContext,
  realStartX: number,
  realStartY: number,
  realEndX: number,
  realEndY: number,
  bulge: number,
  realToCanvasMat: Matrix,
): void {
  if (Math.abs(bulge) < 1e-10) {
    const [endX, endY] = applyToPoint(realToCanvasMat, [realEndX, realEndY])
    ctx.lineTo(endX, endY)
    return
  }

  const arc = computeArcFromBulge(
    realStartX,
    realStartY,
    realEndX,
    realEndY,
    bulge,
  )
  if (!arc) {
    const [endX, endY] = applyToPoint(realToCanvasMat, [realEndX, realEndY])
    ctx.lineTo(endX, endY)
    return
  }

  const [canvasStartX, canvasStartY] = applyToPoint(realToCanvasMat, [
    realStartX,
    realStartY,
  ])
  const [canvasEndX, canvasEndY] = applyToPoint(realToCanvasMat, [
    realEndX,
    realEndY,
  ])
  const [canvasCenterX, canvasCenterY] = applyToPoint(realToCanvasMat, [
    arc.centerX,
    arc.centerY,
  ])

  const canvasRadius = Math.hypot(
    canvasStartX - canvasCenterX,
    canvasStartY - canvasCenterY,
  )
  const startAngle = Math.atan2(
    canvasStartY - canvasCenterY,
    canvasStartX - canvasCenterX,
  )
  const endAngle = Math.atan2(
    canvasEndY - canvasCenterY,
    canvasEndX - canvasCenterX,
  )
  const det =
    realToCanvasMat.a * realToCanvasMat.d -
    realToCanvasMat.b * realToCanvasMat.c
  const isFlipped = det < 0
  const counterclockwise = bulge > 0 ? !isFlipped : isFlipped

  ctx.arc(
    canvasCenterX,
    canvasCenterY,
    canvasRadius,
    startAngle,
    endAngle,
    counterclockwise,
  )
}

function drawRing(
  ctx: CanvasContext,
  ring: Ring,
  realToCanvasMat: Matrix,
): void {
  if (ring.vertices.length < 2) return

  if (ring.vertices.length === 2) {
    const v0 = ring.vertices[0]
    const v1 = ring.vertices[1]
    if (
      v0 &&
      v1 &&
      Math.abs((v0.bulge ?? 0) - 1) < 1e-10 &&
      Math.abs((v1.bulge ?? 0) - 1) < 1e-10
    ) {
      const [x0, y0] = applyToPoint(realToCanvasMat, [v0.x, v0.y])
      ctx.moveTo(x0, y0)
      drawArcFromBulge(ctx, v0.x, v0.y, v1.x, v1.y, 1, realToCanvasMat)
      drawArcFromBulge(ctx, v1.x, v1.y, v0.x, v0.y, 1, realToCanvasMat)
      return
    }
  }

  const firstVertex = ring.vertices[0]
  if (!firstVertex) return
  const [firstX, firstY] = applyToPoint(realToCanvasMat, [
    firstVertex.x,
    firstVertex.y,
  ])
  ctx.moveTo(firstX, firstY)

  for (let i = 0; i < ring.vertices.length; i++) {
    const currentVertex = ring.vertices[i]
    const nextVertex = ring.vertices[(i + 1) % ring.vertices.length]
    if (!currentVertex || !nextVertex) continue

    const bulge = currentVertex.bulge ?? 0
    if (Math.abs(bulge) < 1e-10) {
      const [nextX, nextY] = applyToPoint(realToCanvasMat, [
        nextVertex.x,
        nextVertex.y,
      ])
      ctx.lineTo(nextX, nextY)
    } else {
      drawArcFromBulge(
        ctx,
        currentVertex.x,
        currentVertex.y,
        nextVertex.x,
        nextVertex.y,
        bulge,
        realToCanvasMat,
      )
    }
  }
}

export function processCopperPourSoldermask(params: {
  ctx: CanvasContext
  pour: PcbCopperPour
  realToCanvasMat: Matrix
  soldermaskOverCopperColor: string
  layer: "top" | "bottom"
  elements: AnyCircuitElement[]
}): void {
  const {
    ctx,
    pour,
    realToCanvasMat,
    soldermaskOverCopperColor,
    layer,
    elements,
  } = params
  if (pour.layer !== layer) return
  if (pour.covered_with_solder_mask !== true) return

  ctx.save()
  ctx.fillStyle = soldermaskOverCopperColor

  if (pour.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      pour.center.x,
      pour.center.y,
    ])
    const scaledWidth = pour.width * Math.abs(realToCanvasMat.a)
    const scaledHeight = pour.height * Math.abs(realToCanvasMat.a)

    ctx.translate(cx, cy)
    if (pour.rotation) {
      ctx.rotate(-pour.rotation * (Math.PI / 180))
    }
    ctx.beginPath()
    ctx.rect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight)
    ctx.fill()
    ctx.restore()
    cutCoveredPourOpenings({
      ctx,
      elements,
      layer,
      realToCanvasMat,
    })
    return
  }

  if (pour.shape === "polygon") {
    if (pour.points && pour.points.length >= 3) {
      const canvasPoints = pour.points.map((p: { x: number; y: number }) =>
        applyToPoint(realToCanvasMat, [p.x, p.y]),
      )
      const firstPoint = canvasPoints[0]
      if (firstPoint) {
        ctx.beginPath()
        const [firstX, firstY] = firstPoint
        ctx.moveTo(firstX, firstY)
        for (let i = 1; i < canvasPoints.length; i++) {
          const point = canvasPoints[i]
          if (!point) continue
          const [x, y] = point
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        cutCoveredPourOpenings({
          ctx,
          elements,
          layer,
          realToCanvasMat,
        })
      }
    }
    ctx.restore()
    return
  }

  if (pour.shape === "brep") {
    ctx.beginPath()
    drawRing(ctx, pour.brep_shape.outer_ring, realToCanvasMat)
    if (pour.brep_shape.inner_rings) {
      for (const innerRing of pour.brep_shape.inner_rings) {
        drawRing(ctx, innerRing, realToCanvasMat)
      }
    }
    ctx.fill("evenodd")
    cutCoveredPourOpenings({
      ctx,
      elements,
      layer,
      realToCanvasMat,
    })
    ctx.restore()
    return
  }

  ctx.restore()
}

function cutCoveredPourOpenings(params: {
  ctx: CanvasContext
  elements: AnyCircuitElement[]
  layer: "top" | "bottom"
  realToCanvasMat: Matrix
}): void {
  const { ctx, elements, layer, realToCanvasMat } = params

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"

  for (const element of elements) {
    if (element.type === "pcb_smtpad") {
      if (element.layer !== layer) continue
      if (element.is_covered_with_solder_mask === true) continue
      cutSmtPad({ ctx, pad: element, realToCanvasMat })
      continue
    }

    if (element.type === "pcb_plated_hole") {
      if (element.layers && !element.layers.includes(layer)) continue
      if (element.is_covered_with_solder_mask === true) continue
      cutPlatedHole({ ctx, hole: element, realToCanvasMat })
      continue
    }

    if (element.type === "pcb_via") {
      const via = element as {
        x: number
        y: number
        outer_diameter: number
        layers?: ("top" | "bottom")[]
        is_covered_with_solder_mask?: boolean
      }
      if (via.layers && !via.layers.includes(layer)) continue
      if (via.is_covered_with_solder_mask === true) continue
      drawCircle({
        ctx,
        center: { x: via.x, y: via.y },
        radius: via.outer_diameter / 2,
        fill: "#000",
        realToCanvasMat,
      })
      continue
    }

    if (element.type === "pcb_hole") {
      if (element.is_covered_with_solder_mask === true) continue
      cutHole({ ctx, hole: element, realToCanvasMat })
    }
  }

  ctx.restore()
}

function cutSmtPad(params: {
  ctx: CanvasContext
  pad: PcbSmtPad
  realToCanvasMat: Matrix
}): void {
  const { ctx, pad, realToCanvasMat } = params

  if (pad.shape === "rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      borderRadius: pad.corner_radius ?? pad.rect_border_radius ?? 0,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "rotated_rect") {
    drawRect({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      borderRadius: pad.corner_radius ?? pad.rect_border_radius ?? 0,
      rotation: pad.ccw_rotation ?? 0,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: pad.x, y: pad.y },
      radius: pad.radius,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "pill" || pad.shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: pad.x, y: pad.y },
      width: pad.width,
      height: pad.height,
      rotation: pad.shape === "rotated_pill" ? (pad.ccw_rotation ?? 0) : 0,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (pad.shape === "polygon" && pad.points && pad.points.length >= 3) {
    drawPolygon({
      ctx,
      points: pad.points,
      fill: "#000",
      realToCanvasMat,
    })
  }
}

function cutPlatedHole(params: {
  ctx: CanvasContext
  hole: PcbPlatedHole
  realToCanvasMat: Matrix
}): void {
  const { ctx, hole, realToCanvasMat } = params

  if (hole.shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.outer_diameter / 2,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.outer_width / 2,
      radius_y: hole.outer_height / 2,
      rotation: hole.ccw_rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.outer_width,
      height: hole.outer_height,
      rotation: hole.ccw_rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (
    hole.shape === "circular_hole_with_rect_pad" ||
    hole.shape === "pill_hole_with_rect_pad"
  ) {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      borderRadius: hole.rect_border_radius ?? 0,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.shape === "rotated_pill_hole_with_rect_pad") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.rect_pad_width,
      height: hole.rect_pad_height,
      borderRadius: hole.rect_border_radius ?? 0,
      rotation: hole.rect_ccw_rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (
    hole.shape === "hole_with_polygon_pad" &&
    hole.pad_outline &&
    hole.pad_outline.length >= 3
  ) {
    drawPolygon({
      ctx,
      points: hole.pad_outline.map((point) => ({
        x: hole.x + point.x,
        y: hole.y + point.y,
      })),
      fill: "#000",
      realToCanvasMat,
    })
  }
}

function cutHole(params: {
  ctx: CanvasContext
  hole: PcbHole
  realToCanvasMat: Matrix
}): void {
  const { ctx, hole, realToCanvasMat } = params
  const rotation =
    "ccw_rotation" in hole && typeof hole.ccw_rotation === "number"
      ? hole.ccw_rotation
      : 0

  if (hole.hole_shape === "circle") {
    drawCircle({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius: hole.hole_diameter / 2,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "square") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_diameter,
      height: hole.hole_diameter,
      rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "oval") {
    drawOval({
      ctx,
      center: { x: hole.x, y: hole.y },
      radius_x: hole.hole_width / 2,
      radius_y: hole.hole_height / 2,
      rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "rect") {
    drawRect({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      rotation,
      fill: "#000",
      realToCanvasMat,
    })
    return
  }

  if (hole.hole_shape === "pill" || hole.hole_shape === "rotated_pill") {
    drawPill({
      ctx,
      center: { x: hole.x, y: hole.y },
      width: hole.hole_width,
      height: hole.hole_height,
      rotation,
      fill: "#000",
      realToCanvasMat,
    })
  }
}
