import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('pvcOnboardingVersion', '1')
  })
  await page.reload()
})

test('keeps the editor usable when the workshop backend is unavailable', async ({ page }) => {
  await expect(page).toHaveURL(/#\/editor$/)
  await page.getByRole('button', { name: 'L50', exact: true }).click()
  await expect(page.getByText(/元件数: 1/)).toBeVisible()

  await page.route(/https:\/\/.*\.supabase\.co\//, (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Workshop unavailable' }),
  }))
  await page.getByRole('link', { name: '创意工坊', exact: true }).click()
  await expect(page).toHaveURL(/#\/workshop$/)
  await expect(page.getByRole('heading', { name: '发现公开赛道' })).toBeVisible()
  await expect(page.getByText('创意工坊暂时不可用')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('本地赛道编辑器不受影响。')).toBeVisible()

  await page.getByRole('link', { name: '我的上传', exact: true }).click()
  await expect(page.getByRole('heading', { name: '登录后发布赛道' })).toBeVisible()
  await expect(page.getByRole('button', { name: '发布当前赛道' })).toHaveCount(0)

  await page.getByRole('link', { name: '赛道编辑器', exact: true }).click()
  await expect(page.getByText(/元件数: 1/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/元件数: 1/)).toBeVisible()
})
