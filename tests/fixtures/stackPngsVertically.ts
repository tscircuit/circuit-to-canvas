import { createCanvas, loadImage } from "@napi-rs/canvas"
import { Resvg } from "@resvg/resvg-js"
import * as fs from "node:fs"
import * as path from "node:path"

// Pre-generated label PNGs for common labels
const labelPngCache: Map<string, Buffer> = new Map()
const assetsDir = path.join(__dirname, "assets")

const getPreGeneratedLabelPng = (label: string): Buffer => {
  const cacheKey = label
  if (labelPngCache.has(cacheKey)) {
    return labelPngCache.get(cacheKey)!
  }

  const filename = `label-${label}.png`
  const filepath = path.join(assetsDir, filename)
  if (fs.existsSync(filepath)) {
    const png = fs.readFileSync(filepath)
    labelPngCache.set(cacheKey, png)
    return png
  }
  throw new Error(`Label PNG not found for label: ${label}`)
}

export const stackPngsVertically = async (
  pngs: Array<{ png: Buffer; label: string }>,
): Promise<Buffer> => {
  if (pngs.length === 0) {
    throw new Error("No PNGs provided to stack")
  }

  if (pngs.length === 1) {
    return pngs[0]!.png
  }

  const labelFontSize = 24
  const labelPadding = 8

  // Load all images to get dimensions
  const images = await Promise.all(
    pngs.map(async ({ png }) => await loadImage(png)),
  )

  // Calculate the maximum width and total height
  const maxWidth = Math.max(...images.map((img) => img.width))
  const totalHeight = images.reduce((sum, img) => sum + img.height, 0)

  // Create the final canvas
  const canvas = createCanvas(maxWidth, totalHeight)
  const ctx = canvas.getContext("2d")

  // Fill with dark background
  ctx.fillStyle = "#1a1a1a"
  ctx.fillRect(0, 0, maxWidth, totalHeight)

  // Draw each image and its label
  let currentY = 0
  for (let i = 0; i < pngs.length; i++) {
    const { label } = pngs[i]!
    const img = images[i]!
    const width = img.width
    const height = img.height

    // Center horizontally if image is narrower than max width
    const left = Math.floor((maxWidth - width) / 2)

    // Draw the image
    ctx.drawImage(img, left, currentY)

    // Draw the label
    const labelPng = getPreGeneratedLabelPng(label)
    const labelImg = await loadImage(labelPng!)
    ctx.drawImage(labelImg, 0, currentY)

    currentY += height
  }

  return canvas.toBuffer("image/png")
}

export const svgToPng = (svg: string): Buffer => {
  const resvg = new Resvg(svg)
  return resvg.render().asPng()
}
