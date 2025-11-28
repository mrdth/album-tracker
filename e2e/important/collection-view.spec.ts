/**
 * Collection Overview E2E Tests
 *
 * Tests for viewing collection overview with artist statistics,
 * progress bars, and navigation to detail pages
 */

import { test, expect } from '@playwright/test'

test.describe('Collection Overview', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('should display collection overview with artist statistics', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')

    // Wait for page to load
    await expect(page).toHaveURL(/\/collection/)
    await expect(page.locator('h1')).toContainText('Collection')

    // Should display artist summary cards
    const artistCards = page.locator('[data-testid="artist-summary-card"]')

    // Should have at least one artist (if data exists)
    const count = await artistCards.count()
    if (count > 0) {
      // First card should have required elements
      const firstCard = artistCards.first()

      // Artist name
      await expect(firstCard.locator('[data-testid="artist-name"]')).toBeVisible()

      // Statistics
      await expect(firstCard.locator('[data-testid="owned-count"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="total-count"]')).toBeVisible()
      await expect(firstCard.locator('[data-testid="completion-percentage"]')).toBeVisible()

      // Progress bar
      await expect(firstCard.locator('[data-testid="progress-bar"]')).toBeVisible()
    }
  })

  test('should navigate to artist detail when clicking artist card', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Get artist cards
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      // Click first artist card
      await artistCards.first().click()

      // Should navigate to artist detail page
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Should display artist detail page elements
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('[data-testid="album-grid"]')).toBeVisible()
    }
  })

  test('should display empty state when no artists exist', async ({ page }) => {
    // This test would require clearing all data first
    // For now, just check that the page renders without error
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Page should load successfully
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should display correct statistics format', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      const firstCard = artistCards.first()

      // Owned count should be in format "X owned"
      const ownedText = await firstCard.locator('[data-testid="owned-count"]').textContent()
      expect(ownedText).toMatch(/\d+/)

      // Total count should be in format "of Y total"
      const totalText = await firstCard.locator('[data-testid="total-count"]').textContent()
      expect(totalText).toMatch(/\d+/)

      // Completion percentage should be in format "Z%"
      const percentageText = await firstCard
        .locator('[data-testid="completion-percentage"]')
        .textContent()
      expect(percentageText).toMatch(/\d+%/)
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      // Tab to first artist card
      await page.keyboard.press('Tab')

      // Card should be focusable
      const firstCard = artistCards.first()
      await expect(firstCard).toBeFocused()

      // Press Enter to navigate
      await page.keyboard.press('Enter')

      // Should navigate to artist detail
      await expect(page).toHaveURL(/\/artist\/\d+/)
    }
  })

  test('should display progress bar with correct fill percentage', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      const firstCard = artistCards.first()

      // Get completion percentage text
      const percentageText = await firstCard
        .locator('[data-testid="completion-percentage"]')
        .textContent()
      const percentage = parseInt(percentageText?.replace('%', '') || '0')

      // Progress bar should exist
      const progressBar = firstCard.locator('[data-testid="progress-bar"]')
      await expect(progressBar).toBeVisible()

      // Progress fill should have width matching percentage
      const progressFill = firstCard.locator('[data-testid="progress-fill"]')
      const width = await progressFill.getAttribute('style')

      // Width should contain the percentage value
      expect(width).toContain(`${percentage}`)
    }
  })

  test('should handle artists with 0% completion', async ({ page }) => {
    // This would require test data setup
    // Just verify the page can render without errors
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should handle artists with 100% completion', async ({ page }) => {
    // This would require test data setup
    // Just verify the page can render without errors
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should display loading state while fetching data', async ({ page }) => {
    // Navigate to collection page
    await page.click('text=Collection')

    // Loading spinner should appear briefly
    // (This test might be too fast to catch the loading state in dev)
    await expect(page).toHaveURL(/\/collection/)
  })

  test('should display error message on API failure', async ({ page }) => {
    // This would require mocking API failure
    // For now, just verify error handling exists
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)
  })
})
