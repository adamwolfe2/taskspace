import { chromium, type FullConfig } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'e2e-test@taskspace.test'
const TEST_PASSWORD = 'E2ETestPass123!'
const TEST_NAME = 'E2E Test User'
const AUTH_FILE = 'playwright/.auth/user.json'

/** Return true if the saved auth file exists with a real workspace ID (safe to reuse). */
function savedAuthIsValid(): boolean {
  try {
    if (!existsSync(AUTH_FILE)) return false
    const saved = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'))
    const origin = saved.origins?.find(
      (o: { origin: string }) => o.origin === BASE_URL,
    )
    const wsItem = origin?.localStorage?.find(
      (item: { name: string }) => item.name === 'workspace-storage',
    )
    if (!wsItem) return false
    const wsState = JSON.parse(wsItem.value)
    return typeof wsState.state?.currentWorkspaceId === 'string'
  } catch {
    return false
  }
}

export default async function globalSetup(_config: FullConfig) {
  // Reuse saved auth file if it already has a valid workspace ID.
  // This avoids hitting the organization rate limiter on every test run.
  if (savedAuthIsValid()) return

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()

  // ── Step 1: Pre-warm Next.js routes ──────────────────────────────────────
  await page.goto('/', { timeout: 60000 }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

  await page.goto('/app', { timeout: 60000 })

  // ── Step 2: Detect auth state ─────────────────────────────────────────────
  const authState = await Promise.race([
    page.waitForSelector('#email', { timeout: 90000 }).then(() => 'unauthenticated'),
    page.waitForSelector('[data-sidebar="desktop"]', { timeout: 90000 }).then(() => 'authenticated'),
  ])

  if (authState === 'unauthenticated') {
    // ── Step 3a: Try UI login ───────────────────────────────────────────────
    await page.fill('#email', TEST_EMAIL)
    await page.fill('#password', TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    const loginResult = await Promise.race([
      page.waitForSelector('[data-sidebar="desktop"]', { timeout: 12000 }).then(() => 'ok'),
      page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 12000 }).then(async () => {
        const hasError = await page.locator('[class*="text-red"], [class*="destructive"]').isVisible()
        return hasError ? 'error' : 'ok'
      }),
    ]).catch(() => 'error')

    const onDashboard = loginResult === 'ok' &&
      (await page.locator('[data-sidebar="desktop"]').isVisible({ timeout: 5000 }).catch(() => false))

    if (!onDashboard) {
      // ── Step 3b: Register + create org via in-page fetch ──────────────────
      const setupResult = await page.evaluate(
        async ({ email, password, name }) => {
          const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          }
          const regRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ email, password, name }),
          })
          const regData = await regRes.json()
          if (!regData.success) {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({ email, password }),
            })
            const loginData = await loginRes.json()
            if (!loginData.success) {
              return { ok: false, error: `login failed: ${loginData.error}` }
            }
          }

          const sessionData = await fetch('/api/auth/session', {
            headers,
            credentials: 'include',
          }).then((r) => r.json())

          if (!sessionData.data?.organization) {
            const orgData = await fetch('/api/organizations', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({ name: 'E2E Test Org', timezone: 'America/New_York' }),
            }).then((r) => r.json())
            if (!orgData.success) {
              return { ok: false, error: `org creation failed: ${orgData.error}` }
            }

            const wsData = await fetch('/api/workspaces', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({
                organizationId: orgData.data.id,
                name: 'Main',
                isDefault: true,
              }),
            }).then((r) => r.json())
            if (!wsData.success) {
              return { ok: false, error: `workspace creation failed: ${wsData.error}` }
            }
          }

          return { ok: true }
        },
        { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
      )

      if (!setupResult.ok) {
        throw new Error(`E2E global setup failed: ${setupResult.error}`)
      }
    }
  }

  // ── Step 4: Inject workspace ID + modal skip directly into localStorage ───
  // Retry on 429 with backoff — the org rate limiter may need a moment.
  const result = await page.evaluate(async () => {
    const headers = { 'X-Requested-With': 'XMLHttpRequest' }

    const sessionData = await fetch('/api/auth/session', {
      headers,
      credentials: 'include',
    }).then((r) => r.json()).catch(() => ({}))

    const orgId = (sessionData as { data?: { organization?: { id?: string } } })
      ?.data?.organization?.id
    if (orgId) {
      localStorage.setItem(`ts_usecase_${orgId}`, 'skipped')
    }

    // Pre-warm commonly used API routes to avoid cold-compile delays in tests
    await Promise.all([
      fetch('/api/tasks', { headers, credentials: 'include' }).catch(() => {}),
      fetch('/api/rocks', { headers, credentials: 'include' }).catch(() => {}),
    ])

    // Fetch workspace with retry on 429
    let wsData: Record<string, unknown> = {}
    let wsStatus = 0
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt))
      }
      try {
        const r = await fetch('/api/workspaces', { headers, credentials: 'include' })
        wsStatus = r.status
        wsData = await r.json()
        if (wsStatus !== 429) break
      } catch (e) {
        return { ok: false, debug: `workspace fetch threw: ${e}` }
      }
    }

    const workspaces: Array<{ id: string; isDefault: boolean }> =
      (wsData as { data?: Array<{ id: string; isDefault: boolean }> })?.data ?? []
    const ws = workspaces.find((w) => w.isDefault) ?? workspaces[0]
    if (ws) {
      localStorage.setItem(
        'workspace-storage',
        JSON.stringify({ state: { currentWorkspaceId: ws.id }, version: 0 }),
      )
      return { ok: true, workspaceId: ws.id }
    }
    return {
      ok: false,
      debug: `wsStatus:${wsStatus} workspaces:${workspaces.length} orgId:${orgId} wsData:${JSON.stringify(wsData).slice(0, 200)}`,
    }
  })

  if (!result.ok) {
    throw new Error(`E2E global setup: could not fetch workspace ID — ${result.debug}`)
  }

  // ── Step 5: Save auth + localStorage state ────────────────────────────────
  await context.storageState({ path: AUTH_FILE })
  await browser.close()
}
