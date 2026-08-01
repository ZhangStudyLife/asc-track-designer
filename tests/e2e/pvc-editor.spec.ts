import path from 'node:path'
import { expect, test } from '@playwright/test'

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

test('imports the legacy JSON format and persists the selected theme', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(
    path.resolve('tests/fixtures/pvc/connected.json'),
  )
  await expect(page.getByText(/元件数: 3/)).toBeVisible()

  await page.getByRole('button', { name: '夜间', exact: true }).click()
  await expect(page.getByRole('button', { name: '白天', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '白天', exact: true })).toBeVisible()
})
