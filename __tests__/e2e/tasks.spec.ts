import { test, expect, type Page } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })
test.use({ viewport: { width: 1280, height: 720 } }) // App tests require desktop layout

async function goTasks(page: Page) {
  await page.goto('/app?p=tasks')
  await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
  // Wait for workspace to load (Rock Progress is feature-gated, confirming workspace is ready)
  await page.locator('[data-sidebar="desktop"]')
    .getByRole('button', { name: 'Rock Progress', exact: true })
    .waitFor({ state: 'attached', timeout: 30000 })
}

test.describe('Tasks Page', () => {
  test('tasks page loads without error', async ({ page }) => {
    await goTasks(page)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('shows "Add Task" button', async ({ page }) => {
    await goTasks(page)
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible({ timeout: 10000 })
  })

  test('search input is visible', async ({ page }) => {
    await goTasks(page)
    await expect(page.getByPlaceholder(/search tasks/i)).toBeVisible({ timeout: 10000 })
  })

  test('shows task list or empty state', async ({ page }) => {
    await goTasks(page)
    await expect(
      page.getByText(/no tasks|add your first task|task/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('clicking Add Task opens create modal', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Add New Task/i)).toBeVisible()
  })

  test('add task dialog has title field', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await expect(page.locator('#title')).toBeVisible()
    await expect(page.getByPlaceholder(/What do you need to do/i)).toBeVisible()
  })

  test('save button is disabled when title is empty', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    // The submit button has disabled={!title.trim()}
    const saveBtn = page.getByRole('dialog').getByRole('button', { name: /add task|save|create/i }).last()
    await expect(saveBtn).toBeDisabled()
  })

  test('can create a task and see it in the list', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

    const taskTitle = `E2E Task ${Date.now()}`
    await page.locator('#title').fill(taskTitle)

    // Click the Add Task submit button in the dialog footer
    await page.getByRole('dialog').getByRole('button', { name: /^Add Task$/i }).click()

    // Dialog should close after successful creation
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15000 })

    // Task should appear in the personal tasks list (server response populates type:"personal")
    await expect(page.locator('main').getByText(taskTitle).first()).toBeVisible({ timeout: 15000 })
  })

  test('cancel button closes add task dialog', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.locator('#title').fill('Should not be saved')
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Should not be saved')).not.toBeVisible()
  })

  test('Escape key closes add task dialog', async ({ page }) => {
    await goTasks(page)
    await page.getByRole('button', { name: /add task/i }).click()
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
  })

  test('search input filters tasks', async ({ page }) => {
    await goTasks(page)
    const search = page.getByPlaceholder(/search tasks/i)
    await search.fill('zzznosuchtask')
    // The tasks page shows "No personal tasks yet" for empty results (no separate "no results" state)
    await expect(
      page.getByText(/no personal tasks|no tasks|no results/i).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Task Pool Page', () => {
  test('task pool page loads without error', async ({ page }) => {
    await page.goto('/app?p=taskPool')
    await page.waitForSelector('[data-sidebar="desktop"]', { state: 'attached', timeout: 20000 })
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible({ timeout: 5000 })
  })
})
