import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const fixture = (name: string) => path.resolve(`tests/fixtures/pvc/${name}`)

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads the Vite editor and keeps add, drag, zoom, and box selection working', async ({ page }) => {
  await expect(page).toHaveTitle('ASC 赛道设计器')
  await expect(page.getByText(/元件数: 0/)).toBeVisible()

  await page.getByRole('button', { name: 'L50', exact: true }).click()
  await expect(page.getByText(/元件数: 1/)).toBeVisible()

  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const piece = canvas.locator(':scope > g').first()
  const initialTransform = await piece.getAttribute('transform')
  const dragSurfaceBox = await piece.locator('rect').first().boundingBox()
  expect(dragSurfaceBox).not.toBeNull()

  const dragStart = {
    x: dragSurfaceBox!.x + dragSurfaceBox!.width * 0.25,
    y: dragSurfaceBox!.y + dragSurfaceBox!.height * 0.25,
  }
  await page.mouse.move(dragStart.x, dragStart.y)
  await page.mouse.down()
  await page.mouse.move(dragStart.x + 80, dragStart.y + 40)
  await page.mouse.up()
  await expect.poll(() => piece.getAttribute('transform')).not.toBe(initialTransform)
  const movedTransform = await piece.getAttribute('transform')

  await page.keyboard.press('Control+z')
  await expect.poll(() => piece.getAttribute('transform')).toBe(initialTransform)
  await page.keyboard.press('Control+y')
  await expect.poll(() => piece.getAttribute('transform')).toBe(movedTransform)

  const initialViewBox = await canvas.getAttribute('viewBox')
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, 300)
  await page.keyboard.up('Control')
  await expect.poll(() => canvas.getAttribute('viewBox')).not.toBe(initialViewBox)

  const start = {
    x: canvasBox!.x + canvasBox!.width - 220,
    y: canvasBox!.y + 180,
  }
  const expectedStart = await canvas.evaluate((element, point) => {
    const svg = element as SVGSVGElement
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = point.x
    svgPoint.y = point.y
    const transformed = svgPoint.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: transformed.x, y: transformed.y }
  }, start)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 80, start.y + 60)

  const selection = canvas.locator('rect[stroke="#3b82f6"]')
  await expect(selection).toHaveCount(1)
  expect(Number(await selection.getAttribute('x'))).toBeCloseTo(expectedStart.x, 3)
  expect(Number(await selection.getAttribute('y'))).toBeCloseTo(expectedStart.y, 3)
  await page.mouse.up()
})

test('zooms continuously around the pointer without Ctrl', async ({ page }) => {
  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  const pointer = {
    x: canvasBox!.x + canvasBox!.width * 0.62,
    y: canvasBox!.y + canvasBox!.height * 0.46,
  }
  const readViewBox = async () => {
    const values = (await canvas.getAttribute('viewBox'))!.split(' ').map(Number)
    return { x: values[0], y: values[1], width: values[2], height: values[3] }
  }
  const readPointerCoordinate = () => canvas.evaluate((element, point) => {
    const svg = element as SVGSVGElement
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = point.x
    svgPoint.y = point.y
    const transformed = svgPoint.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: transformed.x, y: transformed.y }
  }, pointer)

  await page.mouse.move(pointer.x, pointer.y)
  const initialViewBox = await readViewBox()
  const initialPointerCoordinate = await readPointerCoordinate()
  await page.mouse.wheel(0, -10)
  await expect.poll(async () => (await readViewBox()).width).toBeLessThan(initialViewBox.width)
  const smallZoomViewBox = await readViewBox()
  const pointerCoordinateAfterZoom = await readPointerCoordinate()
  expect(pointerCoordinateAfterZoom.x).toBeCloseTo(initialPointerCoordinate.x, 1)
  expect(pointerCoordinateAfterZoom.y).toBeCloseTo(initialPointerCoordinate.y, 1)

  await page.mouse.wheel(0, 10)
  await expect.poll(async () => (await readViewBox()).width).toBeCloseTo(initialViewBox.width, 3)
  await page.mouse.wheel(0, -100)
  await expect.poll(async () => (await readViewBox()).width).toBeLessThan(smallZoomViewBox.width)
  const largeZoomViewBox = await readViewBox()
  expect(initialViewBox.width - largeZoomViewBox.width)
    .toBeGreaterThan((initialViewBox.width - smallZoomViewBox.width) * 5)
})

test('selects curve labels and box-selects by the visible track center', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('connected.json'))
  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const curve = canvas.locator('g[data-piece-id="2"]')
  const curvePath = curve.locator('path')

  const labelBox = await curve.locator('text').boundingBox()
  expect(labelBox).not.toBeNull()
  await page.mouse.click(
    labelBox!.x + labelBox!.width / 2,
    labelBox!.y + labelBox!.height / 2,
  )
  await expect(curvePath).toHaveAttribute('stroke', '#ef4444')

  const [start, end] = await canvas.evaluate((element, points) => {
    const svg = element as SVGSVGElement
    const matrix = svg.getScreenCTM()!
    return points.map((point) => {
      const svgPoint = svg.createSVGPoint()
      svgPoint.x = point.x
      svgPoint.y = point.y
      const screenPoint = svgPoint.matrixTransform(matrix)
      return { x: screenPoint.x, y: screenPoint.y }
    })
  }, [{ x: 80, y: -90 }, { x: -20, y: -5 }])

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  await expect(curvePath).toHaveAttribute('stroke', '#ef4444')
  await expect(canvas.locator('g[data-piece-id="1"] rect')).not.toHaveAttribute('stroke', '#ef4444')
  await expect(canvas.locator('g[data-piece-id="3"] rect')).not.toHaveAttribute('stroke', '#ef4444')
})

test('imports the legacy JSON format and persists the selected theme', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(
    fixture('connected.json'),
  )
  await expect(page.getByText(/元件数: 3/)).toBeVisible()

  await page.getByRole('button', { name: '夜间', exact: true }).click()
  await expect(page.getByRole('button', { name: '白天', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '白天', exact: true })).toBeVisible()
})

test('keeps a 200-piece drag responsive and isolated to the moved piece', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(
    fixture('200-pieces.json'),
  )
  await expect(page.getByText(/元件数: 200/)).toBeVisible()

  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const pieces = canvas.locator('g[data-piece-id]')
  await expect(pieces).toHaveCount(200)

  const movedPiece = canvas.locator('g[data-piece-id="1"]')
  const unchangedPiece = canvas.locator('g[data-piece-id="2"]')
  const movedBefore = await movedPiece.getAttribute('transform')
  const unchangedBefore = await unchangedPiece.getAttribute('transform')
  const dragSurfaceBox = await movedPiece.locator('rect').boundingBox()
  expect(dragSurfaceBox).not.toBeNull()

  await page.evaluate(() => {
    const samples: number[] = []
    let previous = performance.now()
    let active = true
    const sample = (now: number) => {
      samples.push(now - previous)
      previous = now
      if (active) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    ;(window as typeof window & { __stopFrameSample?: () => number[] }).__stopFrameSample = () => {
      active = false
      return samples
    }
  })

  const start = {
    x: dragSurfaceBox!.x + dragSurfaceBox!.width * 0.25,
    y: dragSurfaceBox!.y + dragSurfaceBox!.height * 0.25,
  }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (let step = 1; step <= 40; step += 1) {
    await page.mouse.move(start.x + step * 2, start.y + step)
    await page.waitForTimeout(8)
  }
  await page.mouse.up()
  await page.waitForTimeout(100)

  const frameSamples = await page.evaluate(() => (
    (window as typeof window & { __stopFrameSample: () => number[] }).__stopFrameSample()
  ))
  const sortedSamples = frameSamples.slice(2).sort((left, right) => left - right)
  const p95 = sortedSamples[Math.floor(sortedSamples.length * 0.95)]

  expect(await movedPiece.getAttribute('transform')).not.toBe(movedBefore)
  expect(await unchangedPiece.getAttribute('transform')).toBe(unchangedBefore)
  expect(p95).toBeLessThan(35)
})

test('keeps measurement and auto-fill behavior unchanged', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('single-piece.json'))
  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const firstPiece = canvas.locator('g[data-piece-id="1"]')

  await page.getByRole('button', { name: '测量距离', exact: true }).first().click()
  await firstPiece.locator('circle').nth(-2).click()
  await firstPiece.locator('circle').nth(-1).click()
  await expect(canvas.getByText('50.0 mm', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '自动补全直道', exact: true }).click()
  await firstPiece.locator('circle').nth(-2).click()
  await firstPiece.locator('circle').nth(-1).click()
  await expect(canvas.locator('g[data-piece-id]')).toHaveCount(2)

  const generated = canvas.locator('g[data-piece-id]').last()
  const label = await generated.locator('text').textContent()
  expect(Number(label?.slice(1))).toBeCloseTo(50, 5)
  expect(await generated.getAttribute('transform')).toContain('translate(100, 200)')
})

test('drags a multi-selection from the pressed piece without jumping', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('connected.json'))
  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const pieces = canvas.locator('g[data-piece-id]')
  const pressedPiece = canvas.locator('g[data-piece-id="3"]')

  await page.keyboard.press('Control+a')
  const positionsBefore = await pieces.evaluateAll((elements) => elements.map((element) => {
    const match = element.getAttribute('transform')?.match(/translate\(([^,]+), ([^)]+)\)/)
    return { x: Number(match?.[1]), y: Number(match?.[2]) }
  }))
  const dragBox = await pressedPiece.locator('rect').boundingBox()
  expect(dragBox).not.toBeNull()
  const start = { x: dragBox!.x + dragBox!.width * 0.25, y: dragBox!.y + dragBox!.height * 0.25 }
  const end = { x: start.x + 8, y: start.y + 6 }
  const expectedDelta = await canvas.evaluate((element, points) => {
    const svg = element as SVGSVGElement
    const toSvg = (point: { x: number; y: number }) => {
      const svgPoint = svg.createSVGPoint()
      svgPoint.x = point.x
      svgPoint.y = point.y
      return svgPoint.matrixTransform(svg.getScreenCTM()!.inverse())
    }
    const from = toSvg(points.start)
    const to = toSvg(points.end)
    return { x: to.x - from.x, y: to.y - from.y }
  }, { start, end })

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()

  const positionsAfter = await pieces.evaluateAll((elements) => elements.map((element) => {
    const match = element.getAttribute('transform')?.match(/translate\(([^,]+), ([^)]+)\)/)
    return { x: Number(match?.[1]), y: Number(match?.[2]) }
  }))
  positionsAfter.forEach((position, index) => {
    expect(position.x - positionsBefore[index].x).toBeCloseTo(expectedDelta.x, 3)
    expect(position.y - positionsBefore[index].y).toBeCloseTo(expectedDelta.y, 3)
  })
})

test('keeps multi-select rotation, deletion, archives, and recovery working', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('connected.json'))
  const pieces = page.locator('g[data-piece-id]')

  await page.keyboard.press('Control+a')
  await expect(page.locator('g[data-piece-id] > rect[stroke="#ef4444"], g[data-piece-id] > path[stroke="#ef4444"]')).toHaveCount(3)
  const transformsBefore = await pieces.evaluateAll((elements) => elements.map((element) => element.getAttribute('transform')))
  await page.keyboard.press('Tab')
  await expect.poll(async () => JSON.stringify(await pieces.evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('transform')),
  ))).not.toBe(JSON.stringify(transformsBefore))

  await page.keyboard.press('Control+s')
  await page.getByPlaceholder('输入存档名称').fill('回归存档')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trackArchives'))).toContain('回归存档')

  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(pieces).toHaveCount(0)
  await page.getByRole('combobox').selectOption('回归存档')
  await expect(pieces).toHaveCount(3)

  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await expect(pieces).toHaveCount(0)

  await page.evaluate(() => {
    const archive = JSON.parse(localStorage.getItem('archive_回归存档') || '{}')
    localStorage.setItem('currentTrackProject', JSON.stringify({ ...archive, name: '恢复项目' }))
  })
  await page.reload()
  await expect(pieces).toHaveCount(3)
  await expect(page.getByText(/项目: 恢复项目/)).toBeVisible()
})

test('keeps minimap navigation responsive after viewport resize', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('connected.json'))
  await page.setViewportSize({ width: 1180, height: 720 })

  const canvas = page.locator('svg[width="100%"][height="100%"]')
  const miniMap = page.locator('svg[width="300"][height="150"]')
  await expect(miniMap).toBeVisible()
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()
  await page.mouse.move(canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -300)
  await page.keyboard.up('Control')
  const initialViewBox = await canvas.getAttribute('viewBox')
  const viewportRect = miniMap.locator('rect[stroke="#ef4444"]')
  const viewportBox = await viewportRect.boundingBox()
  expect(viewportBox).not.toBeNull()

  await page.mouse.move(viewportBox!.x + viewportBox!.width / 2, viewportBox!.y + viewportBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(viewportBox!.x + viewportBox!.width / 2 + 30, viewportBox!.y + viewportBox!.height / 2 + 15)
  await page.mouse.up()

  await expect.poll(() => canvas.getAttribute('viewBox')).not.toBe(initialViewBox)
})

test('exports BOM JSON and releases repeated PNG export resources', async ({ page }, testInfo) => {
  await page.locator('input[type="file"]').setInputFiles(fixture('connected.json'))

  await page.getByRole('button', { name: /查看BOM/ }).click()
  const [bomDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /导出JSON/ }).click(),
  ])
  const bomPath = testInfo.outputPath('track-info.json')
  await bomDownload.saveAs(bomPath)
  const bom = JSON.parse(await readFile(bomPath, 'utf8'))
  expect(bom.totalPieces).toBe(3)
  expect(bom.details).toHaveLength(3)
  await page.getByRole('button', { name: /关闭/ }).click()

  await page.evaluate(() => {
    const audit = { created: [] as string[], revoked: [] as string[], canvases: [] as HTMLCanvasElement[] }
    ;(window as typeof window & { __exportAudit?: typeof audit }).__exportAudit = audit

    const createObjectURL = URL.createObjectURL.bind(URL)
    const revokeObjectURL = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = (blob) => {
      const url = createObjectURL(blob)
      audit.created.push(url)
      return url
    }
    URL.revokeObjectURL = (url) => {
      audit.revoked.push(url)
      revokeObjectURL(url)
    }

    const createElement = document.createElement.bind(document)
    document.createElement = ((tagName: string, options?: { is?: string }) => {
      const element = createElement(tagName, options)
      if (tagName.toLowerCase() === 'canvas') audit.canvases.push(element as HTMLCanvasElement)
      return element
    }) as typeof document.createElement

    const context = {
      drawImage() {},
      fillRect() {},
      fillText() {},
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      fillStyle: '',
      font: '',
    }
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback) {
      callback(new Blob(['png'], { type: 'image/png' }))
    }
  })

  for (let index = 0; index < 2; index += 1) {
    const [imageDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /导出图片/ }).click(),
    ])
    expect(imageDownload.suggestedFilename()).toMatch(/\.png$/)
  }

  await expect.poll(() => page.evaluate(() => {
    const audit = (window as typeof window & {
      __exportAudit: { created: string[]; revoked: string[]; canvases: HTMLCanvasElement[] }
    }).__exportAudit
    return {
      created: audit.created.length,
      revoked: audit.revoked.length,
      canvasSizes: audit.canvases.map((canvas) => [canvas.width, canvas.height]),
    }
  })).toEqual({ created: 4, revoked: 4, canvasSizes: [[0, 0], [0, 0]] })
})
