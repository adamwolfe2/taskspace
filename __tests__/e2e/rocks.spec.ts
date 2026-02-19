import { test } from '@playwright/test'

test.describe('Rocks Management', () => {
  test.skip('rocks tests require authenticated user', async () => {
    // Will implement after auth helpers are created
  })

  test.describe('Rock Creation', () => {
    test('should create a new rock with all fields', async ({ page: _page }) => {
      test.skip()
      // Navigate to rocks page
      // Click "New Rock" or "+" button
      // Fill in:
      //   - Title
      //   - Description
      //   - Owner (assign to self)
      //   - Due date
      //   - Priority
      // Submit
      // Verify rock appears in list
    })

    test('should validate required fields', async ({ page: _page }) => {
      test.skip()
    })
  })

  test.describe('Rock Assignment', () => {
    test('should assign rock to team member', async ({ page: _page }) => {
      test.skip()
    })

    test('should reassign rock', async ({ page: _page }) => {
      test.skip()
    })
  })

  test.describe('Rock Completion', () => {
    test('should mark rock as complete', async ({ page: _page }) => {
      test.skip()
    })

    test('should show completion status', async ({ page: _page }) => {
      test.skip()
    })
  })
})
