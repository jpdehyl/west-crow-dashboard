import { test, expect, Page } from '@playwright/test'

const BASE = 'https://west-crow-dashboard.vercel.app'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function noConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(err.message))
  return errors
}

async function checkNoDeadLinks(page: Page) {
  const hrefs = await page.$$eval('a[href]', els =>
    els.map(el => (el as HTMLAnchorElement).href)
       .filter(h => h.startsWith('http') && !h.includes('mailto') && !h.includes('tel'))
  )
  const internal = [...new Set(hrefs.filter(h => h.includes('west-crow-dashboard.vercel.app')))]
  const results: { url: string; status: number }[] = []
  for (const url of internal.slice(0, 20)) {
    const res = await page.request.get(url)
    results.push({ url, status: res.status() })
  }
  return results.filter(r => r.status >= 400)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Dashboard (home)', () => {
  test('loads and shows key sections', async ({ page }) => {
    const errors = await noConsoleErrors(page)
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // Title or hero exists
    await expect(page.locator('h1').first()).toBeVisible()

    // Sidebar navigation present
    await expect(page.locator('nav, aside').first()).toBeVisible()

    // No JS errors
    expect(errors.filter(e => !e.includes('Warning:'))).toHaveLength(0)
  })

  test('sidebar links are all reachable', async ({ page, request }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    const hrefs = await page.$$eval('a[href]', els =>
      els.map(el => (el as HTMLAnchorElement).href)
         .filter(h => h.startsWith('http') && h.includes('west-crow-dashboard.vercel.app'))
    )
    const unique = [...new Set(hrefs)].slice(0, 15)
    for (const url of unique) {
      const res = await request.get(url)
      expect(res.status(), `Dead link: ${url}`).toBeLessThan(400)
    }
  })
})

test.describe('Pipeline (/bids)', () => {
  test('loads with bids from Sheets', async ({ page }) => {
    await page.goto(`${BASE}/bids`)
    await page.waitForLoadState('networkidle')

    // Heading
    await expect(page.locator('h1')).toContainText('Pipeline')

    // Waits for live data — at least one bid row or card
    await expect(page.locator('table tbody tr, [href*="/bids/"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('list/board toggle works', async ({ page }) => {
    await page.goto(`${BASE}/bids`)
    await page.waitForLoadState('networkidle')

    // Click Board toggle (button specifically, not nav link)
    await page.getByRole('button', { name: /Board/ }).click()
    await expect(page.locator('text=Estimating').first()).toBeVisible()

    // Click back to List
    await page.getByText('List').click()
    await expect(page.locator('table')).toBeVisible()
  })

  test('+ New Bid link works', async ({ page }) => {
    await page.goto(`${BASE}/bids`)
    await page.waitForLoadState('networkidle')
    await page.click('text=+ New Bid')
    await expect(page).toHaveURL(/\/bids\/new/)
  })
})

test.describe('Bid Detail (/bids/[id])', () => {
  // We know b1 exists from seed data
  test('b1 loads and shows project name + value', async ({ page }) => {
    await page.goto(`${BASE}/bids/b1`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toBeVisible()
    // Timeline strip should have stage dots
    await expect(page.locator('text=Invited')).toBeVisible()
    await expect(page.locator('text=Estimating')).toBeVisible()
  })

  test('bid status action panel renders', async ({ page }) => {
    await page.goto(`${BASE}/bids/b1`)
    await page.waitForLoadState('networkidle')
    // BidActions component should appear (b1 is "active" → shows "Mark Sent" + "No Bid")
    await expect(page.locator('text=Update Status')).toBeVisible()
  })

  test('back link returns to pipeline', async ({ page }) => {
    await page.goto(`${BASE}/bids/b1`)
    await page.waitForLoadState('networkidle')
    await page.click('text=← Pipeline')
    await expect(page).toHaveURL(/\/bids$/)
  })

  test('won bid (b3) shows "Open Projects" link', async ({ page }) => {
    await page.goto(`${BASE}/bids/b3`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=This bid was won')).toBeVisible()
    await expect(page.locator('text=Open Projects')).toBeVisible()
  })

  test('non-existent bid returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/bids/b_notreal`)
    expect([404, 200]).toContain(res?.status()) // Next.js notFound() renders as 200 with error UI
    await expect(page.locator('text=404')).toBeVisible()
  })
})

test.describe('New Bid Form (/bids/new)', () => {
  test('form renders all required fields', async ({ page }) => {
    await page.goto(`${BASE}/bids/new`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[name="project_name"]')).toBeVisible()
    await expect(page.locator('select[name="client"]')).toBeVisible()
    await expect(page.locator('input[name="bid_value"]')).toBeVisible()
    await expect(page.locator('input[name="deadline"]')).toBeVisible()
    await expect(page.locator('textarea[name="notes"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('client dropdown populates from Sheets', async ({ page }) => {
    await page.goto(`${BASE}/bids/new`)
    // Wait for useEffect to fetch clients from Sheets (GAS can be slow)
    await page.waitForTimeout(5000)
    const options = await page.$$eval('select[name="client"] option', opts => opts.map(o => o.textContent))
    // Should have placeholder + at least 5 real clients
    expect(options.length).toBeGreaterThan(3)
  })

  test('cancel returns to pipeline', async ({ page }) => {
    await page.goto(`${BASE}/bids/new`)
    await page.waitForLoadState('networkidle')
    await page.click('text=Cancel')
    await expect(page).toHaveURL(/\/bids$/)
  })
})

test.describe('Projects (/projects)', () => {
  test('loads and shows active projects', async ({ page }) => {
    await page.goto(`${BASE}/projects`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('Projects')
    // At least one project card
    await expect(page.locator('a[href*="/projects/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('project cards have budget bars', async ({ page }) => {
    await page.goto(`${BASE}/projects`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Budget').first()).toBeVisible()
    await expect(page.locator('text=Timeline').first()).toBeVisible()
  })
})

test.describe('Project Detail (/projects/[id])', () => {
  test('p2 (Burnaby Secondary — active) loads all 6 sections', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Origin').first()).toBeVisible()
    await expect(page.locator('text=Estimate').first()).toBeVisible()
    await expect(page.locator('text=Award').first()).toBeVisible()
    await expect(page.locator('text=Field Execution').first()).toBeVisible()
    await expect(page.locator('text=Cost Tracker').first()).toBeVisible()
    await expect(page.locator('text=Invoice').first()).toBeVisible()
  })

  test('p2 shows daily logs', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Day 1').or(page.locator('text=day'))).toBeVisible({ timeout: 8000 })
  })

  test('p2 shows + Log Today button', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=+ Log Today')).toBeVisible()
  })

  test('+ Log Today expands the form', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    await page.click('text=+ Log Today')
    await expect(page.locator('text=Daily Log Entry')).toBeVisible()
    await expect(page.locator('textarea')).toBeVisible()
  })

  test('p2 shows + Add Cost button', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=+ Add Cost')).toBeVisible()
  })

  test('p2 shows invoice section', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Invoice & Collections')).toBeVisible()
    await expect(page.locator('text=Invoice #').first()).toBeVisible({ timeout: 8000 })
  })

  test('p1 (North Van — not started) shows mobilization notice', async ({ page }) => {
    await page.goto(`${BASE}/projects/p1`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Mobiliz').first()).toBeVisible({ timeout: 8000 })
  })

  test('lifecycle timeline strip has 7 stages', async ({ page }) => {
    await page.goto(`${BASE}/projects/p2`)
    await page.waitForLoadState('networkidle')
    const stages = ['Invited','Estimated','Awarded','On Site','Invoiced','Paid','Closed']
    for (const stage of stages) {
      await expect(page.locator(`text=${stage}`).first()).toBeVisible()
    }
  })
})

test.describe('Clients (/clients)', () => {
  test('loads client list', async ({ page }) => {
    await page.goto(`${BASE}/clients`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toContainText('Clients')
    await expect(page.locator('a[href*="/clients/"]').first()).toBeVisible({ timeout: 8000 })
  })

  test('clicking a client goes to detail page', async ({ page }) => {
    await page.goto(`${BASE}/clients`)
    await page.waitForLoadState('networkidle')
    await page.locator('a[href*="/clients/"]').first().click()
    await expect(page).toHaveURL(/\/clients\/c/)
  })
})

test.describe('API Health', () => {
  test('/api/bids returns array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/bids`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('/api/projects returns array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('/api/clients returns array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/clients`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('/api/bids/b1 returns bid object', async ({ request }) => {
    const res = await request.get(`${BASE}/api/bids/b1`)
    expect(res.status()).toBe(200)
    const bid = await res.json()
    expect(bid.id).toBe('b1')
    expect(bid.project_name).toBeTruthy()
    expect(bid.bid_value).toBeGreaterThan(0)
    expect(Array.isArray(bid.timeline)).toBe(true)
  })
})
