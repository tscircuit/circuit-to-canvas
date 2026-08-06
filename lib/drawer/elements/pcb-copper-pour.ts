import type { PcbCopperPour } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawRect } from "../shapes/rect"
import { drawPolygon } from "../shapes/polygon"
import type { Ring } from "circuit-json"

export interface DrawPcbCopperPourParams {
  ctx: CanvasContext
  pour: PcbCopperPour
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function layerToColor(layer: string, colorMap: PcbColorMap): string {
  return (
    colorMap.copper[layer as keyof typeof colorMap.copper] ??
    colorMap.copper.top
  )
}

/**
 * Compute arc center and radius from two points and a bulge value.
 * Bulge is the tangent of 1/4 of the included angle.
 * - bulge = 0: straight line
 * - bulge = 1: semicircle (180 degrees)
 * - bulge > 0: arc bulges to the left of the direction from start to end
 * - bulge < 0: arc bulges to the right
 */
function computeArcFromBulge(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bulge: number,
): { centerX: number; centerY: number; radius: number } | null {
  if (Math.abs(bulge) < 1e-10) {
    return null
  }

  // Calculate chord vector and length
  const chordX = endX - startX
  const chordY = endY - startY
  const chordLength = Math.hypot(chordX, chordY)

  if (chordLength < 1e-10) {
    return null
  }

  // The sagitta (bulge height) is: s = bulge * (chord_length / 2)
  // This is because bulge = tan(theta/4) and s = r - r*cos(theta/2)
  // After simplification: s = (chord/2) * tan(theta/4) = (chord/2) * bulge
  const sagitta = Math.abs(bulge) * (chordLength / 2)

  // Calculate radius from sagitta and chord:
  // From geometry: r = (s^2 + (chord/2)^2) / (2*s)
  const halfChord = chordLength / 2
  const radius = (sagitta * sagitta + halfChord * halfChord) / (2 * sagitta)

  // Distance from chord midpoint to center
  const distToCenter = radius - sagitta

  // Midpoint of the chord
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // Unit vector perpendicular to chord
  // "Left" of the direction from start to end (in standard Y-up coords)
  const perpX = -chordY / chordLength
  const perpY = chordX / chordLength

  // For positive bulge, arc bulges left, so center is to the RIGHT of chord direction
  // For negative bulge, arc bulges right, so center is to the LEFT of chord direction
  const sign = bulge > 0 ? -1 : 1
  const centerX = midX + sign * perpX * distToCenter
  const centerY = midY + sign * perpY * distToCenter

  return { centerX, centerY, radius }
}

/**
 * Draws an arc between two points given a bulge value.
 * Coordinates are in canvas space, but we need the original real-space points
 * to correctly compute the arc direction.
 */
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

  // Compute arc in real coordinates
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

  // Transform all points to canvas coordinates
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

  // Calculate radius in canvas space (may be scaled)
  const canvasRadius = Math.hypot(
    canvasStartX - canvasCenterX,
    canvasStartY - canvasCenterY,
  )

  // Calculate start and end angles in canvas space
  const startAngle = Math.atan2(
    canvasStartY - canvasCenterY,
    canvasStartX - canvasCenterX,
  )
  const endAngle = Math.atan2(
    canvasEndY - canvasCenterY,
    canvasEndX - canvasCenterX,
  )

  // Determine arc direction
  // In real coords: positive bulge = counterclockwise (left-hand rule)
  // The transformation may flip Y, which reverses the apparent direction
  // Check if transformation flips by looking at the determinant (a*d - b*c)
  const det =
    realToCanvasMat.a * realToCanvasMat.d -
    realToCanvasMat.b * realToCanvasMat.c
  const isFlipped = det < 0

  // Positive bulge in real coords = counterclockwise in real coords
  // If flipped, counterclockwise becomes clockwise in canvas coords
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

  // Special case: a circle defined by 2 vertices with bulge=1 each
  if (ring.vertices.length === 2) {
    const v0 = ring.vertices[0]
    const v1 = ring.vertices[1]
    if (
      v0 &&
      v1 &&
      Math.abs((v0.bulge ?? 0) - 1) < 1e-10 &&
      Math.abs((v1.bulge ?? 0) - 1) < 1e-10
    ) {
      // This is a full circle - draw two semicircles
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
    const nextIndex = (i + 1) % ring.vertices.length
    const nextVertex = ring.vertices[nextIndex]

    if (!currentVertex || !nextVertex) continue

    const bulge = currentVertex.bulge ?? 0

    if (Math.abs(bulge) < 1e-10) {
      // No bulge, draw straight line
      const [nextX, nextY] = applyToPoint(realToCanvasMat, [
        nextVertex.x,
        nextVertex.y,
      ])
      ctx.lineTo(nextX, nextY)
    } else {
      // Draw arc based on bulge value (pass real coordinates)
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

/**
 * Appends the pour outline (including brep inner rings) as subpaths to the
 * current path without beginning or filling it. Shared by the pour fill and
 * the clip path that hides trace portions inside same-net pours, so both
 * always use the same geometry. Fill or clip with the "evenodd" rule so
 * inner rings become holes.
 */
export function addCopperPourPath(
  ctx: CanvasContext,
  pour: PcbCopperPour,
  realToCanvasMat: Matrix,
): void {
  if (pour.shape === "rect") {
    const rotationRad = ((pour.rotation ?? 0) * Math.PI) / 180
    const cosR = Math.cos(rotationRad)
    const sinR = Math.sin(rotationRad)
    const halfWidth = pour.width / 2
    const halfHeight = pour.height / 2

    const realCorners: Array<[number, number]> = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
    ].map(([dx, dy]) => [
      pour.center.x + dx! * cosR - dy! * sinR,
      pour.center.y + dx! * sinR + dy! * cosR,
    ])

    const canvasCorners = realCorners.map((corner) =>
      applyToPoint(realToCanvasMat, corner),
    )
    const firstCorner = canvasCorners[0]
    if (!firstCorner) return

    ctx.moveTo(firstCorner[0], firstCorner[1])
    for (let i = 1; i < canvasCorners.length; i++) {
      const corner = canvasCorners[i]
      if (!corner) continue
      ctx.lineTo(corner[0], corner[1])
    }
    ctx.closePath()
    return
  }

  if (pour.shape === "polygon") {
    if (!pour.points || pour.points.length < 3) return

    const canvasPoints = pour.points.map((p: { x: number; y: number }) =>
      applyToPoint(realToCanvasMat, [p.x, p.y]),
    )
    const firstPoint = canvasPoints[0]
    if (!firstPoint) return

    ctx.moveTo(firstPoint[0], firstPoint[1])
    for (let i = 1; i < canvasPoints.length; i++) {
      const point = canvasPoints[i]
      if (!point) continue
      ctx.lineTo(point[0], point[1])
    }
    ctx.closePath()
    return
  }

  if (pour.shape === "brep") {
    // Outer ring plus inner rings (holes) - rely on the evenodd rule
    drawRing(ctx, pour.brep_shape.outer_ring, realToCanvasMat)
    if (pour.brep_shape.inner_rings) {
      for (const innerRing of pour.brep_shape.inner_rings) {
        drawRing(ctx, innerRing, realToCanvasMat)
      }
    }
  }
}

export function drawPcbCopperPour(params: DrawPcbCopperPourParams): void {
  const { ctx, pour, realToCanvasMat, colorMap } = params

  const color = layerToColor(pour.layer, colorMap)
  const opacity = 0.5

  // Save context to apply opacity
  ctx.save()
  ctx.globalAlpha = opacity

  ctx.beginPath()
  addCopperPourPath(ctx, pour, realToCanvasMat)
  ctx.fillStyle = color
  ctx.fill("evenodd")
  ctx.restore()
}
