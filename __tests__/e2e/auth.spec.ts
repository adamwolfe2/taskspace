import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should register a new user successfully', async ({ page }) => {
    // Navigate to register page
    await page.click('text=Sign up')

    // Fill in registration form
    const timestamp = Date.now()
    const testEmail = `test-${timestamp}@taskspace.test`
    const testPassword = 'TestPassword123!'

    await page.fill('input[name="name"]', `Test User ${timestamp}`)
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="organizationName"]', `Test Org ${timestamp}`)

    // Submit registration
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    // Verify we're logged in (check for user menu or workspace name)
    await expect(page.locator('text=Test Org')).toBeVisible({ timeout: 5000 })
  })

  test('should login existing user successfully', async ({ page }) => {
    // This test assumes a test user exists in the database
    // For now, we'll skip this and test with the user we just created
    test.skip()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Log in')

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@test.com')
    await page.fill('input[name="password"]', 'wrongpassword')

    // Submit login
    await page.click('button[type="submit"]')

    // Verify error message is shown
    await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible({ timeout: 5000 })
  })

  test('should validate password strength on registration', async ({ page }) => {
    await page.click('text=Sign up')

    // Try with weak password
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'weak')

    // Should show password strength error
    await expect(page.locator('text=/password.*must/i')).toBeVisible()
  })

  test('should logout successfully', async ({ page }) => {
    // Skip for now - requires auth state
    test.skip()
  })
})
