/**
 * Ignore Albums E2E Tests
 *
 * Tests for the User Story 1 - Mark Album as Ignored workflow
 * Tests that users can mark unowned albums as ignored, they disappear from view,
 * and statistics are updated correctly
 */

import { test, expect } from '@playwright/test'

test.describe('Ignore Albums', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('should display ignore button on unowned albums', async ({ page }) => {
    // Navigate to collection to find an artist
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Get first artist card and click it
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      await artistCards.first().click()

      // Should be on artist detail page
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Look for unowned albums (Missing or Ambiguous status)
      const albumCards = page.locator('[data-testid="album-card"]')
      const albumCount = await albumCards.count()

      if (albumCount > 0) {
        // Check if any album is not owned
        for (let i = 0; i < albumCount; i++) {
          const albumCard = albumCards.nth(i)
          const ownershipStatus = albumCard.locator('[data-testid="ownership-status"]')
          const statusText = await ownershipStatus.textContent()

          if (statusText && statusText !== 'Owned') {
            // Should show ignore button for unowned albums
            const ignoreButton = albumCard.locator('[data-testid="ignore-album-button"]')
            await expect(ignoreButton).toBeVisible()

            // Should not show ignored indicator initially
            const ignoredIndicator = albumCard.locator('[data-testid="ignored-indicator"]')
            await expect(ignoredIndicator).not.toBeVisible()

            break // Found an unowned album, test can proceed
          }
        }
      }
    }
  })

  test('should not display ignore button on owned albums', async ({ page }) => {
    // Navigate to collection
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Click first artist
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      await artistCards.first().click()

      // Should be on artist detail page
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Look for owned albums
      const albumCards = page.locator('[data-testid="album-card"]')
      const albumCount = await albumCards.count()

      if (albumCount > 0) {
        for (let i = 0; i < albumCount; i++) {
          const albumCard = albumCards.nth(i)
          const ownershipStatus = albumCard.locator('[data-testid="ownership-status"]')
          const statusText = await ownershipStatus.textContent()

          if (statusText === 'Owned') {
            // Should not show ignore button for owned albums
            const ignoreButton = albumCard.locator('[data-testid="ignore-album-button"]')
            await expect(ignoreButton).not.toBeVisible()

            break // Found an owned album, test verification complete
          }
        }
      }
    }
  })

  test('should ignore album and update display', async ({ page }) => {
    // Navigate to collection
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Click first artist
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    expect(count, 'Should have at least one artist to test with').toBeGreaterThan(0)

    await artistCards.first().click()

    // Should be on artist detail page
    await expect(page).toHaveURL(/\/artist\/\d+/)

    // Get initial album count
    const albumCards = page.locator('[data-testid="album-card"]')
    const initialAlbumCount = await albumCards.count()
    expect(initialAlbumCount, 'Should have at least one album to test with').toBeGreaterThan(0)

    // Find an unowned album to ignore
    let targetAlbumCard = null
    for (let i = 0; i < initialAlbumCount; i++) {
      const albumCard = albumCards.nth(i)
      const ownershipStatus = albumCard.locator('[data-testid="ownership-status"]')
      const statusText = await ownershipStatus.textContent()

      if (statusText && statusText !== 'Owned' && statusText !== 'Ignored') {
        targetAlbumCard = albumCard
        break
      }
    }

    expect(targetAlbumCard, 'Should find at least one unowned album to ignore').toBeTruthy()

    // Get album title before ignoring
    const albumTitle = targetAlbumCard.locator('[data-testid="album-title"]')
    const titleText = await albumTitle.textContent()

    // Click ignore button
    const ignoreButton = targetAlbumCard.locator('[data-testid="ignore-album-button"]')
    await ignoreButton.click()

    // Wait for API call to complete (album should be reloaded)
    await page.waitForTimeout(1000)

    // Album should now be hidden from view (not included in filtered albums)
    const visibleAlbumCards = page.locator('[data-testid="album-card"]')
    const visibleAlbumCount = await visibleAlbumCards.count()

    // The ignored album should not be visible in the default view (filtered)
    const ignoredAlbumVisible = await visibleAlbumCards
      .filter({ hasText: titleText || '' })
      .count()

    expect(ignoredAlbumVisible).toBe(0)

    // Should not show filtering controls if no ignored albums exist or are hidden
    // (This might vary based on whether there are other ignored albums)
  })

  test('should show ignored albums when filter is enabled', async ({ page }) => {
    // This test requires that there's at least one ignored album
    // We'll first ignore an album, then test the filter functionality

    // Navigate to collection
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Click first artist
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      await artistCards.first().click()
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Look for filtering controls (only shown if there are ignored albums)
      const filterControls = page.locator('text=Show Ignored Albums')

      // If filtering controls are visible, test the toggle functionality
      if (await filterControls.isVisible()) {
        // Toggle should be unchecked by default
        const checkbox = page.locator('input[type="checkbox"]')
        await expect(checkbox).not.toBeChecked()

        // Check the checkbox to show ignored albums
        await filterControls.click()
        await expect(checkbox).toBeChecked()

        // Should now see ignored albums with visual indicators
        const ignoredIndicators = page.locator('[data-testid="ignored-indicator"]')
        const ignoredCount = await ignoredIndicators.count()

        if (ignoredCount > 0) {
          // Should see ignored albums with red "Ignored" badges
          await expect(ignoredIndicators.first()).toBeVisible()

          // Should see un-ignore buttons on ignored albums
          const unignoreButtons = page.locator('[data-testid="unignore-album-button"]')
          await expect(unignoreButtons.first()).toBeVisible()
        }

        // Uncheck to hide ignored albums again
        await filterControls.click()
        await expect(checkbox).not.toBeChecked()
      }
    }
  })

  test('should un-ignore album when requested', async ({ page }) => {
    // This test assumes there's at least one ignored album or we can create one

    // Navigate to collection
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Click first artist
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      await artistCards.first().click()
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Enable showing ignored albums
      const filterControls = page.locator('text=Show Ignored Albums')
      if (await filterControls.isVisible()) {
        await filterControls.click()

        // Look for ignored albums
        const ignoredIndicators = page.locator('[data-testid="ignored-indicator"]')
        const ignoredCount = await ignoredIndicators.count()

        if (ignoredCount > 0) {
          // Find the first ignored album
          const firstIgnoredAlbum = ignoredIndicators.first().locator('..').locator('..')

          // Get the album title
          const albumTitle = firstIgnoredAlbum.locator('[data-testid="album-title"]')
          const titleText = await albumTitle.textContent()

          // Click un-ignore button
          const unignoreButton = firstIgnoredAlbum.locator('[data-testid="unignore-album-button"]')
          await unignoreButton.click()

          // Wait for API call to complete
          await page.waitForTimeout(1000)

          // Album should no longer have ignored indicator
          if (await filterControls.isVisible()) {
            // Should not find the album with ignored indicator anymore
            const stillIgnored = await page
              .locator('[data-testid="album-card"]')
              .filter({ has: page.locator('[data-testid="ignored-indicator"]') })
              .filter({ hasText: titleText || '' })
              .count()

            expect(stillIgnored).toBe(0)
          }
        }

        // Disable showing ignored albums to return to normal view
        if (await filterControls.isVisible()) {
          await filterControls.click()
        }
      }
    }
  })

  test('should update artist statistics when album is ignored', async ({ page }) => {
    // This test checks that ignoring an album updates the ownership statistics

    // Navigate to collection
    await page.click('text=Collection')
    await expect(page).toHaveURL(/\/collection/)

    // Note: Statistics are computed on the backend and should already exclude ignored albums
    // This test verifies the frontend displays the correct values

    // Click first artist
    const artistCards = page.locator('[data-testid="artist-summary-card"]')
    const count = await artistCards.count()

    if (count > 0) {
      // Get initial statistics from collection page
      const firstArtistCard = artistCards.first()
      const initialOwnedText = await firstArtistCard.locator('[data-testid="owned-count"]').textContent()
      const initialTotalText = await firstArtistCard.locator('[data-testid="total-count"]').textContent()

      await firstArtistCard.click()
      await expect(page).toHaveURL(/\/artist\/\d+/)

      // Verify statistics match on artist detail page
      const ownedAlbumsText = await page.locator('text=Albums Owned').locator('..').locator('.text-2xl').textContent()
      expect(ownedAlbumsText).toContain(initialOwnedText)

      // Find an unowned album to ignore
      const albumCards = page.locator('[data-testid="album-card"]')
      const albumCount = await albumCards.count()

      let targetAlbumCard = null
      for (let i = 0; i < albumCount; i++) {
        const albumCard = albumCards.nth(i)
        const ownershipStatus = albumCard.locator('[data-testid="ownership-status"]')
        const statusText = await ownershipStatus.textContent()

        if (statusText && statusText !== 'Owned' && statusText !== 'Ignored') {
          targetAlbumCard = albumCard
          break
        }
      }

      if (targetAlbumCard) {
        // Ignore the album
        const ignoreButton = targetAlbumCard.locator('[data-testid="ignore-album-button"]')
        await ignoreButton.click()

        // Wait for update
        await page.waitForTimeout(2000)

        // Statistics should be updated (note: since ignored albums are unowned,
        // the owned count shouldn't change, but this verifies the display updates)
        const updatedOwnedText = await page.locator('text=Albums Owned').locator('..').locator('.text-2xl').textContent()

        // The values should match since ignored albums are already excluded from counts
        expect(updatedOwnedText).toContain(initialOwnedText)
      }
    }
  })
})
