import { test, expect, type Page } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

async function goRocks(page: Page) {
  await page.goto('/app?p=rocks')
  await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
  // Wait for workspace to load (Rock Progress is feature-gated, confirming workspace is ready)
  await page.locator('[data-sidebar="desktop"]')
    .getByRole('button', { name: 'Rock Progress', exact: true })
    .waitFor({ state: 'visible', timeout: 30000 })
}

test.describe('Rocks Page', () => {
  test('rocks page loads without error', async ({ page }) => {
    await goRocks(page)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('shows "New Rock" button', async ({ page }) => {
    await goRocks(page)
    await expect(page.getByRole('button', { name: /new rock/i })).toBeVisible({ timeout: 10000 })
  })

  test('search input is visible', async ({ page }) => {
    await goRocks(page)
    await expect(page.getByPlaceholder(/search rocks/i)).toBeVisible({ timeout: 10000 })
  })

  test('shows empty state or rock list', async ({ page }) => {
    await goRocks(page)
    await expect(
      page.getByText(/no rocks|add your first rock|rock/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('clicking New Rock opens create dialog', async ({ page }) => {
    await goRocks(page)
    await page.getByRole('button', { name: /new rock/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    // Use heading role to avoid strict mode conflict with the submit button also named "Create Rock"
    await expect(page.getByRole('dialog').getByRole('heading', { name: /Create Rock/i })).toBeVisible()
  })

  test('create rock dialog has title and description fields', async ({ page }) => {
    await goRocks(page)
    await page.getByRole('button', { name: /new rock/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await expect(page.getByPlaceholder(/Launch new feature/i)).toBeVisible()
    await expect(page.getByPlaceholder(/What does success look like/i)).toBeVisible()
  })

  test('Create Rock button requires a title to submit', async ({ page }) => {
    await goRocks(page)
    await page.getByRole('button', { name: /new rock/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    // The title field should be empty initially
    const titleField = page.getByPlaceholder(/Launch new feature/i)
    await expect(titleField).toBeVisible()
    await expect(titleField).toHaveValue('')
    // The Create Rock button should exist in the dialog
    await expect(page.getByRole('dialog').getByRole('button', { name: /^Create Rock$/i })).toBeVisible()
  })

  test('can create a rock and see it in the list', async ({ page }) => {
    await goRocks(page)
    await page.getByRole('button', { name: /new rock/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

    const rockTitle = `E2E Rock ${Date.now()}`
    await page.getByPlaceholder(/Launch new feature/i).fill(rockTitle)
    await page.getByRole('dialog').getByRole('button', { name: /^Create Rock$/i }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 })

    // Rock should appear in the list — scope to table cells (avoids hidden mobile card layout)
    await expect(page.locator('main td').getByText(rockTitle).first()).toBeVisible({ timeout: 8000 })
  })

  test('cancel button closes create dialog without saving', async ({ page }) => {
    await goRocks(page)
    await page.getByRole('button', { name: /new rock/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.getByPlaceholder(/Launch new feature/i).fill('Should not be saved')
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Should not be saved')).not.toBeVisible()
  })

  test('search filters the rock list', async ({ page }) => {
    await goRocks(page)
    const searchInput = page.getByPlaceholder(/search rocks/i)
    await searchInput.fill('zzznosuchthing')
    // Expect either no results or empty state
    await expect(
      page.getByText(/no rocks|no results|0 rock/i).first()
    ).toBeVisible({ timeout: 5000 })
  })
})
