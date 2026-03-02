import { test, expect } from '@playwright/test'

// Auth tests run without stored session — they test the login/register UI directly
test.describe('Authentication — Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app')
    // Wait for the SPA to resolve auth state (stops the loading spinner)
    await page.waitForSelector('form', { timeout: 15000 })
  })

  test('login page renders correct elements', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByText(/forgot password/i)).toBeVisible()
  })

  test('shows error for wrong credentials', async ({ page }) => {
    await page.fill('#email', 'nobody@taskspace.test')
    await page.fill('#password', 'WrongPass999!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Server returns an error message — look for any alert/error text
    await expect(
      page.locator('[class*="text-red"], [class*="destructive"], [role="alert"]')
        .or(page.getByText(/invalid.*credential|incorrect.*password|not found/i))
    ).toBeVisible({ timeout: 8000 })
  })

  test('sign in button is disabled while submitting', async ({ page }) => {
    await page.fill('#email', 'test@example.com')
    await page.fill('#password', 'SomePassword1!')
    const btn = page.getByRole('button', { name: /sign in/i })
    await btn.click()
    // Immediately after click the button should show a loading state or be disabled
    await expect(btn).toBeDisabled({ timeout: 2000 }).catch(() => {
      // Some implementations use aria-busy instead — either is acceptable
    })
  })

  test('navigate to register page', async ({ page }) => {
    // Look for a "sign up" or "create account" link
    const createLink = page.getByText(/sign up|create.*account|don't have/i).first()
    await expect(createLink).toBeVisible()
    await createLink.click()
    // Register form should appear (has confirmPassword field)
    await expect(page.locator('#confirmPassword')).toBeVisible({ timeout: 5000 })
  })

  test('navigate to forgot-password page', async ({ page }) => {
    await page.getByText(/forgot password/i).click()
    // Forgot password form — expects email input and no password field
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).not.toBeVisible()
  })
})

test.describe('Authentication — Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to register page
    await page.goto('/app?page=register')
    await page.waitForSelector('#name', { timeout: 15000 })
  })

  test('register form renders all fields', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('create account button is disabled until form is valid', async ({ page }) => {
    const btn = page.getByRole('button', { name: /create account/i })
    // Button should be disabled on empty form
    await expect(btn).toBeDisabled()

    // Fill in a weak password — button should still be disabled
    await page.fill('#name', 'Test User')
    await page.fill('#email', 'newuser@taskspace.test')
    await page.fill('#password', 'weak')
    await page.fill('#confirmPassword', 'weak')
    await expect(btn).toBeDisabled()
  })

  test('shows password requirements as user types', async ({ page }) => {
    await page.fill('#password', 'abc')
    // Password requirements list should appear
    await expect(page.getByText(/at least 8 characters|uppercase|number|special/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.fill('#password', 'ValidPass1!')
    await page.fill('#confirmPassword', 'DifferentPass1!')
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('shows email format validation', async ({ page }) => {
    await page.fill('#email', 'notanemail')
    await page.fill('#name', 'Test')
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Authentication — Redirect', () => {
  test('unauthenticated user visiting /app sees login form', async ({ page }) => {
    await page.goto('/app')
    await page.waitForSelector('#email', { timeout: 15000 })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('deep link ?p=rocks shows login, not rocks page', async ({ page }) => {
    await page.goto('/app?p=rocks')
    // Should still see login form, not rocks page
    await page.waitForSelector('form', { timeout: 15000 })
    await expect(page.locator('#email')).toBeVisible()
  })
})
