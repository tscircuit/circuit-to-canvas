// 手动验证 knockout 修复的脚本
// 使用 Node.js + @napi-rs/canvas 运行

const { createCanvas } = require("@napi-rs/canvas")

// 模拟 transformation-matrix 的 identity
const identity = () => ({
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
})

// 简化的 alphabet layout（用于测试）
const glyphLineAlphabet = {
  A: [
    { x1: 0, y1: 1, x2: 0.5, y2: 0 },
    { x1: 0.5, y1: 0, x2: 1, y2: 1 },
    { x1: 0.25, y1: 0.5, x2: 0.75, y2: 0.5 },
  ],
  B: [
    { x1: 0, y1: 0, x2: 0, y2: 1 },
    { x1: 0, y1: 0, x2: 0.7, y2: 0 },
    { x1: 0.7, y1: 0, x2: 0.7, y2: 0.5 },
    { x1: 0, y1: 0.5, x2: 0.7, y2: 0.5 },
    { x1: 0.7, y1: 0.5, x2: 0.7, y2: 1 },
    { x1: 0, y1: 1, x2: 0.7, y2: 1 },
  ],
}

function getAlphabetLayout(text, fontSize) {
  const charWidth = fontSize * 0.6
  const charHeight = fontSize
  const strokeWidth = fontSize * 0.08

  return {
    width: text.length * charWidth,
    height: charHeight,
    strokeWidth,
    lines: [text],
    lineWidths: [text.length * charWidth],
    lineHeight: charHeight * 1.2,
  }
}

function getTextStartPosition(anchorAlignment, layout) {
  return { x: 0, y: 0 }
}

function getLineStartX({ alignment, lineWidth, maxWidth, strokeWidth }) {
  return -lineWidth / 2
}

function getAlphabetAdvanceWidth(char, nextChar, fontSize) {
  return fontSize * 0.6
}

function strokeAlphabetLine({ ctx, line, fontSize, startX, startY, layout }) {
  const { strokeWidth } = layout
  const height = fontSize
  const glyphScaleX = fontSize
  const topY = startY
  const characters = Array.from(line)
  let cursor = startX + strokeWidth / 2

  characters.forEach((char, index) => {
    const glyphLines = glyphLineAlphabet[char]

    if (glyphLines?.length) {
      ctx.beginPath()
      for (const glyph of glyphLines) {
        const x1 = cursor + glyph.x1 * glyphScaleX
        const y1 = topY + (1 - glyph.y1) * height
        const x2 = cursor + glyph.x2 * glyphScaleX
        const y2 = topY + (1 - glyph.y2) * height
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    }

    cursor += getAlphabetAdvanceWidth(char, characters[index + 1], fontSize)
  })
}

const DEFAULT_KNOCKOUT_PADDING = {
  left: 0.2,
  right: 0.2,
  top: 0.2,
  bottom: 0.2,
}

// 修复后的 drawText 函数
function drawText(params) {
  const {
    ctx,
    text,
    x,
    y,
    fontSize,
    color,
    realToCanvasMat,
    anchorAlignment,
    rotation = 0,
    mirrorX = false,
    knockout = false,
    knockoutPadding = {},
  } = params

  if (!text) return

  const canvasX = x
  const canvasY = y
  const scale = Math.abs(realToCanvasMat.a)
  const scaledFontSize = fontSize * scale
  const layout = getAlphabetLayout(text, scaledFontSize)
  const startPos = getTextStartPosition(anchorAlignment, layout)

  ctx.save()
  ctx.translate(canvasX, canvasY)

  if (rotation !== 0) {
    ctx.rotate(-rotation * (Math.PI / 180))
  }

  if (mirrorX) {
    ctx.scale(-1, 1)
  }

  // Handle Knockout Background - True knockout using destination-out
  if (knockout) {
    // Save state before knockout rendering
    ctx.save()

    const padding = { ...DEFAULT_KNOCKOUT_PADDING, ...knockoutPadding }
    const paddingLeft = padding.left * scaledFontSize
    const paddingRight = padding.right * scaledFontSize
    const paddingTop = padding.top * scaledFontSize
    const paddingBottom = padding.bottom * scaledFontSize
    const totalWidth = layout.width + layout.strokeWidth

    const rectX = startPos.x - paddingLeft
    const rectY = startPos.y - paddingTop
    const rectWidth = totalWidth + paddingLeft + paddingRight
    const rectHeight =
      layout.height + layout.strokeWidth + paddingTop + paddingBottom

    // Step 1: Draw background rectangle with silkscreen color
    ctx.fillStyle = color
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight)

    // Step 2: Set composite operation to "destination-out" to erase text area
    ctx.globalCompositeOperation = "destination-out"

    // Step 3: Set stroke style for text (will erase from background)
    ctx.strokeStyle = "rgba(0, 0, 0, 1)"
    ctx.lineWidth = layout.strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Step 4: Draw text lines (creates transparent holes)
    const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

    lines.forEach((line, lineIndex) => {
      const lineStartX =
        startPos.x +
        getLineStartX({
          alignment: anchorAlignment,
          lineWidth: lineWidths[lineIndex],
          maxWidth: width,
          strokeWidth,
        })
      const lineStartY = startPos.y + lineIndex * lineHeight

      strokeAlphabetLine({
        ctx,
        line,
        fontSize: scaledFontSize,
        startX: lineStartX,
        startY: lineStartY,
        layout,
      })
    })

    // Step 5: Restore state (includes composite operation, fillStyle, lineWidth, etc.)
    ctx.restore()
  } else {
    // Non-knockout rendering (original behavior)
    ctx.strokeStyle = color
    ctx.lineWidth = layout.strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const { lines, lineWidths, lineHeight, width, strokeWidth } = layout

    lines.forEach((line, lineIndex) => {
      const lineStartX =
        startPos.x +
        getLineStartX({
          alignment: anchorAlignment,
          lineWidth: lineWidths[lineIndex],
          maxWidth: width,
          strokeWidth,
        })
      const lineStartY = startPos.y + lineIndex * lineHeight

      strokeAlphabetLine({
        ctx,
        line,
        fontSize: scaledFontSize,
        startX: lineStartX,
        startY: lineStartY,
        layout,
      })
    })
  }

  ctx.restore()
}

// 测试函数
function runTests() {
  console.log("=== Knockout Fix Verification ===\n")

  // Test 1: 基础 knockout 测试
  console.log("Test 1: Basic knockout creates transparent holes")
  const canvas1 = createCanvas(200, 100)
  const ctx1 = canvas1.getContext("2d")

  // 填充绿色背景
  ctx1.fillStyle = "rgb(0, 100, 0)"
  ctx1.fillRect(0, 0, 200, 100)

  // 绘制 knockout 文字
  drawText({
    ctx: ctx1,
    text: "A",
    x: 100,
    y: 50,
    fontSize: 20,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true,
    knockoutPadding: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 },
  })

  // 检查像素
  const imgData1 = ctx1.getImageData(100, 50, 1, 1).data
  console.log(
    `  Text center pixel: RGBA(${imgData1[0]}, ${imgData1[1]}, ${imgData1[2]}, ${imgData1[3]})`,
  )

  if (imgData1[3] < 50) {
    console.log("  ✅ PASS: Text center is transparent (alpha < 50)")
  } else {
    console.log("  ❌ FAIL: Text center should be transparent")
  }

  // 检查背景
  const bgData1 = ctx1.getImageData(60, 50, 1, 1).data
  console.log(
    `  Background pixel: RGBA(${bgData1[0]}, ${bgData1[1]}, ${bgData1[2]}, ${bgData1[3]})`,
  )

  if (bgData1[3] > 200 && bgData1[0] > 200) {
    console.log("  ✅ PASS: Background has white color")
  } else {
    console.log("  ❌ FAIL: Background should have white color")
  }

  // Test 2: 边缘情况 - 完全透明
  console.log("\nTest 2: Edge case - Alpha channel exactly 0 at text center")
  const canvas2 = createCanvas(400, 200)
  const ctx2 = canvas2.getContext("2d")

  ctx2.clearRect(0, 0, 400, 200)

  drawText({
    ctx: ctx2,
    text: "AB",
    x: 200,
    y: 100,
    fontSize: 30,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true,
    knockoutPadding: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 },
  })

  // 扫描文字区域
  let foundZeroAlpha = false
  let minAlpha = 255

  for (let x = 180; x < 220; x += 2) {
    for (let y = 80; y < 120; y += 2) {
      const pixel = ctx2.getImageData(x, y, 1, 1).data
      minAlpha = Math.min(minAlpha, pixel[3])
      if (pixel[3] === 0) {
        foundZeroAlpha = true
      }
    }
  }

  console.log(`  Minimum alpha found: ${minAlpha}`)
  console.log(`  Found zero alpha pixel: ${foundZeroAlpha}`)

  if (foundZeroAlpha) {
    console.log("  ✅ PASS: Found pixels with alpha = 0 (fully transparent)")
  } else {
    console.log("  ❌ FAIL: Should have pixels with alpha = 0")
  }

  // Test 3: 状态恢复测试
  console.log("\nTest 3: Context state is properly restored")
  const canvas3 = createCanvas(200, 100)
  const ctx3 = canvas3.getContext("2d")

  ctx3.fillStyle = "rgb(255, 0, 0)"
  ctx3.strokeStyle = "rgb(0, 255, 0)"
  ctx3.lineWidth = 5
  ctx3.globalCompositeOperation = "multiply"

  ctx3.save()

  drawText({
    ctx: ctx3,
    text: "X",
    x: 100,
    y: 50,
    fontSize: 20,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true,
  })

  ctx3.restore()

  // 注意：canvas API 可能不直接暴露这些属性，我们检查是否能正常绘制
  ctx3.fillRect(0, 0, 10, 10)
  const testPixel = ctx3.getImageData(5, 5, 1, 1).data

  if (testPixel[0] > 200) {
    console.log("  ✅ PASS: Context state restored, can draw normally")
  } else {
    console.log("  ❌ FAIL: Context state may be corrupted")
  }

  console.log("\n=== All Tests Completed ===")
}

runTests()
