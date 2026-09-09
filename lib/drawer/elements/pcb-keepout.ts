import type { PCBKeepout } from "circuit-json"
import type { Matrix } from "transformation-matrix"
import { applyToPoint } from "transformation-matrix"
import type { PcbColorMap, CanvasContext } from "../types"
import { drawLine } from "../shapes/line"
import {
  drawCirclePath,
  drawPolygonPath,
  drawRectPath,
} from "./helper-functions"

/** Circuit JSON `pcb_keepout` with `shape: "outline"`. */
export interface PcbKeepoutOutline {
  type: "pcb_keepout"
  shape: "outline"
  pcb_keepout_id: string
  outline: Array<{ x: number; y: number }>
  stroke_width: number
  layers: string[]
  description?: string
  pcb_group_id?: string
  subcircuit_id?: string
}

export type DrawablePcbKeepout = PCBKeepout | PcbKeepoutOutline

export interface DrawPcbKeepoutParams {
  ctx: CanvasContext
  keepout: DrawablePcbKeepout
  realToCanvasMat: Matrix
  colorMap: PcbColorMap
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getKeepoutColor(
  keepout: DrawablePcbKeepout,
  colorMap: PcbColorMap,
): string {
  return keepout.layers.includes("bottom") && !keepout.layers.includes("top")
    ? colorMap.keepout.bottom
    : colorMap.keepout.top
}

function drawHatchLines(params: {
  ctx: CanvasContext
  strokeColor: string
  hatchWidth: number
  hatchSpacing: number
  diagonal: number
  getLineEndpoints: (offset: number) => {
    startX: number
    startY: number
    endX: number
    endY: number
  }
}): void {
  const {
    ctx,
    strokeColor,
    hatchWidth,
    hatchSpacing,
    diagonal,
    getLineEndpoints,
  } = params

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = hatchWidth
  ctx.setLineDash([])

  for (let offset = -diagonal; offset < diagonal * 2; offset += hatchSpacing) {
    const { startX, startY, endX, endY } = getLineEndpoints(offset)
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()
  }
}

function drawKeepoutSurface(params: {
  ctx: CanvasContext
  strokeColor: string
  fillColor: string
  drawPath: () => void
  drawHatch: () => void
}): void {
  const { ctx, fillColor, drawPath, drawHatch } = params

  drawPath()
  ctx.fillStyle = fillColor
  ctx.fill()

  drawPath()
  ctx.clip()
  drawHatch()
}

export function drawPcbKeepout(params: DrawPcbKeepoutParams): void {
  const { ctx, keepout, realToCanvasMat, colorMap } = params
  const scale = Math.abs(realToCanvasMat.a)
  const strokeColor = getKeepoutColor(keepout, colorMap)
  const fillColor = hexToRgba(strokeColor, 0.2)
  const hatchSpacing = 1.0 * scale
  const hatchWidth = 0.15 * scale

  if (keepout.shape === "rect") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      keepout.center.x,
      keepout.center.y,
    ])
    const scaledWidth = keepout.width * scale
    const scaledHeight = keepout.height * scale
    const rotation = (keepout as { rotation?: number }).rotation ?? 0
    const diagonal = Math.sqrt(
      scaledWidth * scaledWidth + scaledHeight * scaledHeight,
    )
    const halfWidth = scaledWidth / 2
    const halfHeight = scaledHeight / 2

    ctx.save()
    ctx.translate(cx, cy)

    if (rotation !== 0) {
      ctx.rotate(-rotation * (Math.PI / 180))
    }

    drawKeepoutSurface({
      ctx,
      strokeColor,
      fillColor,
      drawPath: () =>
        drawRectPath({
          ctx,
          cx: 0,
          cy: 0,
          width: scaledWidth,
          height: scaledHeight,
        }),
      drawHatch: () =>
        drawHatchLines({
          ctx,
          strokeColor,
          hatchWidth,
          hatchSpacing,
          diagonal,
          getLineEndpoints: (offset) => ({
            startX: -halfWidth + offset,
            startY: -halfHeight,
            endX: -halfWidth + offset + diagonal,
            endY: -halfHeight + diagonal,
          }),
        }),
    })

    ctx.restore()
    return
  }

  if (keepout.shape === "circle") {
    const [cx, cy] = applyToPoint(realToCanvasMat, [
      keepout.center.x,
      keepout.center.y,
    ])
    const scaledRadius = keepout.radius * scale
    const diagonal = scaledRadius * 2

    ctx.save()
    ctx.translate(cx, cy)

    drawKeepoutSurface({
      ctx,
      strokeColor,
      fillColor,
      drawPath: () =>
        drawCirclePath({
          ctx,
          cx: 0,
          cy: 0,
          radius: scaledRadius,
        }),
      drawHatch: () =>
        drawHatchLines({
          ctx,
          strokeColor,
          hatchWidth,
          hatchSpacing,
          diagonal,
          getLineEndpoints: (offset) => ({
            startX: offset - diagonal,
            startY: -diagonal,
            endX: offset + diagonal,
            endY: diagonal,
          }),
        }),
    })

    ctx.restore()
    return
  }

  if (keepout.shape !== "outline") return

  const outline = keepout.outline ?? []
  if (outline.length < 2) return

  if (outline.length === 2) {
    const start = outline[0]
    const end = outline[1]
    if (!start || !end) return
    drawLine({
      ctx,
      start,
      end,
      strokeWidth: keepout.stroke_width,
      stroke: strokeColor,
      realToCanvasMat,
    })
    return
  }

  const mapped = outline.map((pt) => {
    const [x, y] = applyToPoint(realToCanvasMat, [pt.x, pt.y])
    return { x, y }
  })
  const xs = mapped.map((pt) => pt.x)
  const ys = mapped.map((pt) => pt.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const width = maxX - minX
  const height = maxY - minY
  const diagonal = Math.sqrt(width * width + height * height)

  ctx.save()
  drawKeepoutSurface({
    ctx,
    strokeColor,
    fillColor,
    drawPath: () => {
      ctx.beginPath()
      drawPolygonPath({ ctx, points: mapped })
    },
    drawHatch: () =>
      drawHatchLines({
        ctx,
        strokeColor,
        hatchWidth,
        hatchSpacing,
        diagonal,
        getLineEndpoints: (offset) => ({
          startX: minX + offset,
          startY: minY,
          endX: minX + offset + diagonal,
          endY: minY + diagonal,
        }),
      }),
  })
  ctx.restore()
}
