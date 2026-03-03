import { test, expect, type Page } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })
test.use({ viewport: { width: 1280, height: 720 } }) // App tests require desktop layout

async function goDashboard(page: Page) {
  await page.goto('/app?p=dashboard')
  await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
  // Wait for workspace to load (Rock Progress is feature-gated, confirming workspace is ready)
  await page.locator('[data-sidebar="desktop"]')
    .getByRole('button', { name: 'Rock Progress', exact: true })
    .waitFor({ state: 'attached', timeout: 30000 })
  // Dismiss any modal that might appear (e.g. use-case selector on first load)
  const modal = page.getByRole('dialog')
  if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
}

/** Navigate to dashboard and switch to the Manual EOD tab */
async function goEODManual(page: Page) {
  await goDashboard(page)
  await page.getByRole('tab', { name: /manual/i }).click()
}

test.describe('EOD Report Submission', () => {
  test('EOD submission tabs are visible on dashboard', async ({ page }) => {
    await goDashboard(page)
    // The EOD section has a tab strip with "AI Text Dump" and "Manual" tabs
    await expect(page.getByRole('tab', { name: /AI Text Dump/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /manual/i })).toBeVisible({ timeout: 10000 })
  })

  test('EOD submission card has tasks accomplished field', async ({ page }) => {
    await goEODManual(page)
    await expect(
      page.getByPlaceholder(/What did you accomplish/i)
    ).toBeVisible({ timeout: 10000 })
  })

  test('EOD challenges field is visible', async ({ page }) => {
    await goEODManual(page)
    await expect(page.locator('#challenges')).toBeVisible({ timeout: 10000 })
  })

  test('can type into tasks accomplished field', async ({ page }) => {
    await goEODManual(page)
    const field = page.getByPlaceholder(/What did you accomplish/i).first()
    await field.fill('Completed the E2E test suite for TaskSpace')
    await expect(field).toHaveValue('Completed the E2E test suite for TaskSpace')
  })

  test('can type into challenges field', async ({ page }) => {
    await goEODManual(page)
    const field = page.locator('#challenges')
    await field.fill('No major blockers today')
    await expect(field).toHaveValue('No major blockers today')
  })

  test('submit EOD report button is present', async ({ page }) => {
    await goEODManual(page)
    await expect(
      page.getByRole('button', { name: /Submit EOD/i })
    ).toBeVisible({ timeout: 10000 })
  })

  test('submitting a minimal EOD report succeeds', async ({ page }) => {
    await goEODManual(page)

    // Fill accomplishments (first task field)
    const taskField = page.getByPlaceholder(/What did you accomplish/i).first()
    await taskField.fill('E2E smoke test task')

    // Fill challenges (required field)
    await page.locator('#challenges').fill('No blockers')

    // Submit
    await page.getByRole('button', { name: /Submit EOD/i }).click()

    // Expect the success toast (exact match avoids matching aria-live announcements)
    await expect(page.getByText('EOD Report Submitted', { exact: true })).toBeVisible({ timeout: 10000 })
  })
})

test.describe('EOD History', () => {
  test('history page loads without error', async ({ page }) => {
    await page.goto('/app?p=history')
    await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
    // Should not show an error boundary
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('history page renders a list or empty state', async ({ page }) => {
    await page.goto('/app?p=history')
    await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
    // History page shows content — either empty state heading or report list with date headings
    const main = page.locator('main[role="main"]')
    await expect(main.locator('h2, h3').first()).toBeVisible({ timeout: 10000 })
  })
})
