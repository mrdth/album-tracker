import { test, expect } from '@playwright/test'

test.describe('P2: Library Configuration and Scanning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')

    // Setup: Import an artist first
    await page.getByRole('searchbox', { name: /search.*artist/i }).fill('Radiohead')
    await page.getByRole('button', { name: /search/i }).click()

    // Wait for results and import
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /import/i }).first().click()

    // Wait for artist detail page
    await expect(page.getByRole('heading', { name: /radiohead/i })).toBeVisible({ timeout: 10000 })
  })

  test('should configure library path and trigger scan', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click()

    // Verify settings page loaded
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

    // Set library path
    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('/tmp/test-music-library')

    await page.getByRole('button', { name: /save/i }).click()

    // Verify success notification
    await expect(page.getByText(/library.*path.*saved/i)).toBeVisible({ timeout: 5000 })

    // Navigate to artist detail
    await page.getByRole('link', { name: /collection/i }).click()
    await page.getByRole('article', { name: /radiohead/i }).click()

    // Trigger scan
    await page.getByRole('button', { name: /scan library/i }).click()

    // Verify loading state with accessible announcement
    await expect(page.getByRole('status', { name: /scanning/i })).toBeVisible({ timeout: 2000 })

    // Verify scan completion
    await expect(page.getByText(/scan complete/i)).toBeVisible({ timeout: 15000 })

    // Verify ownership status is displayed on albums
    const albums = page.getByRole('article').filter({ has: page.getByRole('status') })
    await expect(albums.first()).toBeVisible()
  })

  test('should show validation error for invalid library path', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click()

    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('/nonexistent/path/to/nowhere')

    await page.getByRole('button', { name: /save/i }).click()

    // Verify error message
    const errorAlert = page.getByRole('alert')
    await expect(errorAlert).toBeVisible({ timeout: 5000 })
    await expect(errorAlert).toContainText(/does not exist/i)
  })

  test('should reject relative paths', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click()

    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('../relative/path')

    await page.getByRole('button', { name: /save/i }).click()

    // Verify error message
    await expect(page.getByRole('alert')).toContainText(/absolute path/i)
  })

  test('should reject path traversal attempts', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click()

    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('/tmp/../etc/passwd')

    await page.getByRole('button', { name: /save/i }).click()

    // Verify error message
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })

  test('should display scan results summary', async ({ page }) => {
    // Configure library path first
    await page.getByRole('link', { name: /settings/i }).click()
    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('/tmp/test-music-library')
    await page.getByRole('button', { name: /save/i }).click()

    // Navigate to artist and scan
    await page.getByRole('link', { name: /collection/i }).click()
    await page.getByRole('article', { name: /radiohead/i }).click()
    await page.getByRole('button', { name: /scan library/i }).click()

    // Wait for scan completion
    await expect(page.getByText(/scan complete/i)).toBeVisible({ timeout: 15000 })

    // Verify summary is displayed
    const summary = page.getByRole('region', { name: /scan.*summary/i })
    await expect(summary).toContainText(/scanned/i)
    await expect(summary).toContainText(/matched/i)
  })

  test('should show loading spinner during scan', async ({ page }) => {
    // Configure library path
    await page.getByRole('link', { name: /settings/i }).click()
    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await pathInput.fill('/tmp/test-music-library')
    await page.getByRole('button', { name: /save/i }).click()

    // Navigate to artist
    await page.getByRole('link', { name: /collection/i }).click()
    await page.getByRole('article', { name: /radiohead/i }).click()

    // Trigger scan
    await page.getByRole('button', { name: /scan library/i }).click()

    // Verify loading spinner is visible
    await expect(page.getByRole('status').filter({ has: page.locator('svg') })).toBeVisible()

    // Verify scan button is disabled during scan
    await expect(page.getByRole('button', { name: /scan library/i })).toBeDisabled()
  })

  test('should handle scan errors gracefully', async ({ page }) => {
    // Don't configure library path - should fail
    await page.getByRole('link', { name: /collection/i }).click()
    await page.getByRole('article', { name: /radiohead/i }).click()
    await page.getByRole('button', { name: /scan library/i }).click()

    // Verify error message is displayed
    await expect(page.getByRole('alert')).toContainText(/library.*path.*not configured/i, { timeout: 5000 })
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click()

    // Tab to library path input
    await page.keyboard.press('Tab')
    const pathInput = page.getByRole('textbox', { name: /library.*path/i })
    await expect(pathInput).toBeFocused()

    // Type path
    await page.keyboard.type('/tmp/test-library')

    // Tab to save button
    await page.keyboard.press('Tab')
    const saveButton = page.getByRole('button', { name: /save/i })
    await expect(saveButton).toBeFocused()

    // Press Enter to save
    await page.keyboard.press('Enter')

    // Verify save action triggered
    await expect(page.getByText(/library.*path.*saved/i)).toBeVisible({ timeout: 5000 })
  })
})
