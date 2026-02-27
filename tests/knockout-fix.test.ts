import { test, expect } from "bun:test"
import { drawText } from "../lib/drawer/shapes/text/text"
import { identity } from "transformation-matrix"

// 创建内存 Canvas 进行测试
function createTestCanvas(width = 200, height = 100) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

// 获取像素数据
function getPixelData(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const pixel = ctx.getImageData(x, y, 1, 1).data
  return {
    r: pixel[0],
    g: pixel[1],
    b: pixel[2],
    a: pixel[3]
  }
}

test("knockout text creates transparent holes", () => {
  const canvas = createTestCanvas()
  const ctx = canvas.getContext("2d")!
  
  // 填充背景色（模拟 PCB 板材）
  ctx.fillStyle = "rgb(0, 100, 0)" // 绿色背景
  ctx.fillRect(0, 0, 200, 100)
  
  // 绘制 knockout 文字
  drawText({
    ctx,
    text: "A",
    x: 100,
    y: 50,
    fontSize: 10,
    color: "rgb(255, 255, 255)", // 白色丝印
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true,
    knockoutPadding: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 }
  })
  
  // 检查背景区域（应该有白色背景 - alpha > 200）
  const bgPixel = getPixelData(ctx, 70, 50)
  expect(bgPixel.a).toBeGreaterThan(200)
  expect(bgPixel.r).toBeGreaterThan(200)
  expect(bgPixel.g).toBeGreaterThan(200)
  expect(bgPixel.b).toBeGreaterThan(200)
  
  // 检查文字中心（应该是透明，露出绿色背景 - alpha < 50）
  const textPixel = getPixelData(ctx, 100, 50)
  expect(textPixel.a).toBeLessThan(50)
  // 由于透明，应该能看到底层的绿色
  expect(textPixel.g).toBeGreaterThan(50)
})

test("non-knockout text renders normally", () => {
  const canvas = createTestCanvas()
  const ctx = canvas.getContext("2d")!
  
  ctx.fillStyle = "rgb(0, 100, 0)"
  ctx.fillRect(0, 0, 200, 100)
  
  drawText({
    ctx,
    text: "A",
    x: 100,
    y: 50,
    fontSize: 10,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: false
  })
  
  // 非 knockout 模式下，文字应该可见（白色）
  const textPixel = getPixelData(ctx, 100, 50)
  expect(textPixel.r).toBeGreaterThan(200)
  expect(textPixel.g).toBeGreaterThan(200)
  expect(textPixel.b).toBeGreaterThan(200)
  expect(textPixel.a).toBeGreaterThan(200)
})

test("EDGE CASE: knockout text alpha channel is exactly 0 at text center", () => {
  const canvas = createTestCanvas(400, 200)
  const ctx = canvas.getContext("2d")!
  
  // 完全透明的背景
  ctx.clearRect(0, 0, 400, 200)
  
  // 绘制 knockout 文字
  drawText({
    ctx,
    text: "TEST",
    x: 200,
    y: 100,
    fontSize: 20,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true,
    knockoutPadding: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 }
  })
  
  // 扫描文字区域的像素，检查是否有完全透明的点
  let foundTransparentPixel = false
  let minAlpha = 255
  
  // 扫描文字中心区域（大致范围）
  for (let x = 180; x < 220; x++) {
    for (let y = 80; y < 120; y++) {
      const pixel = getPixelData(ctx, x, y)
      minAlpha = Math.min(minAlpha, pixel.a)
      if (pixel.a === 0) {
        foundTransparentPixel = true
      }
    }
  }
  
  // 必须找到完全透明的像素（文字镂空处）
  expect(foundTransparentPixel).toBe(true)
  expect(minAlpha).toBe(0)
})

test("EDGE CASE: ctx state is properly restored after knockout", () => {
  const canvas = createTestCanvas()
  const ctx = canvas.getContext("2d")!
  
  // 设置初始状态
  ctx.fillStyle = "rgb(255, 0, 0)"
  ctx.strokeStyle = "rgb(0, 255, 0)"
  ctx.lineWidth = 5
  ctx.globalCompositeOperation = "multiply"
  
  // 保存初始状态
  ctx.save()
  
  // 绘制 knockout 文字
  drawText({
    ctx,
    text: "X",
    x: 100,
    y: 50,
    fontSize: 10,
    color: "rgb(255, 255, 255)",
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true
  })
  
  // 恢复状态
  ctx.restore()
  
  // 验证状态被正确恢复
  expect(ctx.fillStyle).toBe("#ff0000")
  expect(ctx.strokeStyle).toBe("#00ff00")
  expect(ctx.lineWidth).toBe(5)
  expect(ctx.globalCompositeOperation).toBe("multiply")
})

test("EDGE CASE: multiple knockout texts don't interfere", () => {
  const canvas = createTestCanvas(400, 200)
  const ctx = canvas.getContext("2d")!
  
  ctx.clearRect(0, 0, 400, 200)
  
  // 绘制多个 knockout 文字
  drawText({
    ctx,
    text: "A",
    x: 100,
    y: 100,
    fontSize: 15,
    color: "rgb(255, 0, 0)", // 红色
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true
  })
  
  drawText({
    ctx,
    text: "B",
    x: 200,
    y: 100,
    fontSize: 15,
    color: "rgb(0, 255, 0)", // 绿色
    realToCanvasMap: identity(),
    anchorAlignment: "center",
    knockout: true
  })
  
  drawText({
    ctx,
    text: "C",
    x: 300,
    y: 100,
    fontSize: 15,
    color: "rgb(0, 0, 255)", // 蓝色
    realToCanvasMat: identity(),
    anchorAlignment: "center",
    knockout: true
  })
  
  // 每个文字中心都应该是透明的
  const pixelA = getPixelData(ctx, 100, 100)
  const pixelB = getPixelData(ctx, 200, 100)
  const pixelC = getPixelData(ctx, 300, 100)
  
  expect(pixelA.a).toBeLessThan(50)
  expect(pixelB.a).toBeLessThan(50)
  expect(pixelC.a).toBeLessThan(50)
  
  // 背景区域应该保留各自的颜色
  const bgRed = getPixelData(ctx, 70, 100)
  const bgGreen = getPixelData(ctx, 170, 100)
  const bgBlue = getPixelData(ctx, 270, 100)
  
  expect(bgRed.r).toBeGreaterThan(200)
  expect(bgGreen.g).toBeGreaterThan(200)
  expect(bgBlue.b).toBeGreaterThan(200)
})
