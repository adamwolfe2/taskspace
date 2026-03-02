import { test, expect, type Page } from '@playwright/test'

// All navigation tests run as an authenticated user
test.use({ storageState: 'playwright/.auth/user.json' })

// Wait for sidebar AND workspace-gated items to load (workspace loads async).
// Workspace features are fetched after auth — feature-gated nav items only
// appear once the workspace is loaded.
async function waitForApp(page: Page) {
  await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
  // "Rock Progress" is feature-gated; its presence confirms workspace is loaded
  await page.locator('[data-sidebar="desktop"]')
    .getByRole('button', { name: 'Rock Progress', exact: true })
    .waitFor({ state: 'visible', timeout: 30000 })
}

test.describe('Authenticated Navigation', () => {
  test('dashboard loads after login', async ({ page }) => {
    await page.goto('/app')
    await waitForApp(page)
    await expect(page.locator('[data-sidebar="desktop"]')).toBeVisible()
  })

  test('URL ?p= parameter routes to correct page', async ({ page }) => {
    await page.goto('/app?p=rocks')
    await waitForApp(page)
    await expect(page).toHaveTitle(/Rock Progress|Rocks|TaskSpace/, { timeout: 8000 })
  })

  test('sidebar navigation items are visible', async ({ page }) => {
    await page.goto('/app')
    await waitForApp(page)
    const sidebar = page.locator('[data-sidebar="desktop"]')
    // Use exact match to avoid "Admin Dashboard" matching "Dashboard"
    await expect(sidebar.getByText('Dashboard', { exact: true })).toBeVisible()
    await expect(sidebar.getByText('Tasks', { exact: true })).toBeVisible()
    await expect(sidebar.getByText('Rock Progress', { exact: true })).toBeVisible()
  })

  test('clicking Dashboard nav item shows dashboard', async ({ page }) => {
    await page.goto('/app?p=tasks')
    await waitForApp(page)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'Dashboard', exact: true }).click()
    await expect(page).toHaveURL(/[?&]p=dashboard/, { timeout: 8000 })
  })

  test('clicking Tasks nav item shows tasks page', async ({ page }) => {
    await page.goto('/app')
    await waitForApp(page)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page).toHaveURL(/[?&]p=tasks/, { timeout: 8000 })
  })

  test('clicking Rock Progress nav item shows rocks page', async ({ page }) => {
    await page.goto('/app')
    await waitForApp(page)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'Rock Progress', exact: true }).click()
    await expect(page).toHaveURL(/[?&]p=rocks/, { timeout: 8000 })
  })

  test('clicking EOD History shows history page', async ({ page }) => {
    await page.goto('/app')
    await waitForApp(page)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'EOD History', exact: true }).click()
    await expect(page).toHaveURL(/[?&]p=history/, { timeout: 8000 })
  })

  test('browser back/forward navigation works', async ({ page }) => {
    await page.goto('/app?p=dashboard')
    await waitForApp(page)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page).toHaveURL(/[?&]p=tasks/, { timeout: 8000 })
    await page.goBack()
    await expect(page).toHaveURL(/[?&]p=dashboard/, { timeout: 5000 })
  })

  test('command palette opens with Cmd+K', async ({ page }) => {
    await page.goto('/app')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
  })

  test('main content area is accessible (has main landmark)', async ({ page }) => {
    await page.goto('/app')
    await page.waitForSelector('[data-sidebar="desktop"]', { timeout: 20000 })
    await expect(page.locator('main[role="main"]')).toBeVisible()
  })

  test('page title updates on navigation', async ({ page }) => {
    await page.goto('/app?p=dashboard')
    await waitForApp(page)
    await expect(page).toHaveTitle(/Dashboard.*TaskSpace|TaskSpace.*Dashboard/)
    await page.locator('[data-sidebar="desktop"]')
      .getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page).toHaveTitle(/Tasks.*TaskSpace|TaskSpace.*Tasks/, { timeout: 5000 })
  })
})

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('desktop sidebar is hidden on mobile', async ({ page }) => {
    await page.goto('/app')
    // On mobile the sidebar container exists in DOM but is hidden via CSS — use 'attached' not 'visible'
    await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
    await expect(page.locator('[data-sidebar="desktop"]')).toBeHidden()
  })

  test('mobile quick-add task button is visible', async ({ page }) => {
    await page.goto('/app')
    // Wait for page to be interactive before checking mobile elements
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByLabel('Add new task')).toBeVisible({ timeout: 20000 })
  })
})
