import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

async function waitForWorkspace(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
  await page.locator('[data-sidebar="desktop"]')
    .getByRole('button', { name: 'Rock Progress', exact: true })
    .waitFor({ state: 'visible', timeout: 30000 })
}

test.describe('Settings Page', () => {
  test('settings page loads without error', async ({ page }) => {
    await page.goto('/app?p=settings')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('settings page has tabs', async ({ page }) => {
    await page.goto('/app?p=settings')
    await waitForWorkspace(page)
    // Should see at least a Profile or General tab
    await expect(
      page.getByRole('tab').first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Scorecard Page', () => {
  test('scorecard page loads without error', async ({ page }) => {
    await page.goto('/app?p=scorecard')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('IDS Board', () => {
  test('IDS board page loads without error', async ({ page }) => {
    await page.goto('/app?p=ids-board')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Notes Page', () => {
  test('notes page loads without error', async ({ page }) => {
    await page.goto('/app?p=notes')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Calendar Page', () => {
  test('calendar page loads without error', async ({ page }) => {
    await page.goto('/app?p=calendar')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Org Chart Page', () => {
  test('org chart page loads without error', async ({ page }) => {
    await page.goto('/app?p=org-chart')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('V/TO Page', () => {
  test('vto page loads without error', async ({ page }) => {
    await page.goto('/app?p=vto')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})

test.describe('Marketing Pages', () => {
  // These do NOT require auth
  test.use({ storageState: { cookies: [], origins: [] } })

  test('marketing homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/[Tt]askspace/i, { timeout: 10000 })
  })

  test('features page loads', async ({ page }) => {
    await page.goto('/features')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 })
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText(/privacy/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByText(/terms/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('404 page renders for unknown route', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist-at-all-xyz')
    // Next.js returns 404 status or shows not-found page
    expect([404, 200]).toContain(res?.status())
    await expect(page.getByRole('heading', { name: /not found|404/i }).first()).toBeVisible({ timeout: 5000 })
  })
})
