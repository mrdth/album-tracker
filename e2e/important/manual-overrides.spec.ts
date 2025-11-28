import { test, expect } from '@playwright/test'

test.describe('Manual Album Overrides', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')

    // Wait for the app to load
    await page.waitForLoadState('networkidle')
  })

  test('should manually link album to folder', async ({ page }) => {
    // Navigate to collection
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    // Click on an artist to view their albums
    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Find an album that is Missing
    const missingAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('text=/Missing|Not Owned/i'),
    }).first()

    // Click "Link Folder" button
    await missingAlbum.locator('[data-testid="link-folder-button"]').click()

    // Directory browser dialog should appear
    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()

    // Wait for directories to load
    await page.waitForLoadState('networkidle')

    // Navigate through directories
    const directoryList = dialog.locator('[data-testid="directory-list"]')
    await expect(directoryList).toBeVisible()

    // Click on a directory to navigate into it
    const firstDirectory = directoryList.locator('[data-testid="directory-item"]').first()
    await firstDirectory.dblclick()

    // Wait for navigation
    await page.waitForLoadState('networkidle')

    // Select a folder by single-clicking
    const targetFolder = directoryList.locator('[data-testid="directory-item"]').first()
    await targetFolder.click()

    // Confirm selection
    await dialog.locator('[data-testid="confirm-selection-button"]').click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Album should now show as Owned with manual override indicator
    await expect(missingAlbum).toContainText(/Owned/i)
    await expect(missingAlbum.locator('[data-testid="manual-override-indicator"]')).toBeVisible()
  })

  test('should navigate directory browser with keyboard', async ({ page }) => {
    // Navigate to collection and open directory browser
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    const missingAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('text=/Missing|Not Owned/i'),
    }).first()
    await missingAlbum.locator('[data-testid="link-folder-button"]').click()

    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Focus on directory list
    const directoryList = dialog.locator('[data-testid="directory-list"]')
    await directoryList.focus()

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')

    // Navigate into directory with Enter
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')

    // Navigate up with Backspace or Escape
    await page.keyboard.press('Escape')

    // Dialog should close
    await expect(dialog).not.toBeVisible()
  })

  test('should toggle album ownership status', async ({ page }) => {
    // Navigate to collection and artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Find an Owned album
    const ownedAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('text=/Owned/i'),
    }).first()

    // Click "Toggle Ownership" button
    await ownedAlbum.locator('[data-testid="toggle-ownership-button"]').click()
    await page.waitForLoadState('networkidle')

    // Album should now show as Missing
    await expect(ownedAlbum).toContainText(/Missing/i)
    await expect(ownedAlbum.locator('[data-testid="manual-override-indicator"]')).toBeVisible()

    // Toggle back
    await ownedAlbum.locator('[data-testid="toggle-ownership-button"]').click()
    await page.waitForLoadState('networkidle')

    // Should be Owned again
    await expect(ownedAlbum).toContainText(/Owned/i)
  })

  test('should clear manual override', async ({ page }) => {
    // Navigate to collection and artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Find an album with manual override
    const overriddenAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('[data-testid="manual-override-indicator"]'),
    }).first()

    // Should have clear override button visible
    const clearButton = overriddenAlbum.locator('[data-testid="clear-override-button"]')
    await expect(clearButton).toBeVisible()

    // Click clear override
    await clearButton.click()
    await page.waitForLoadState('networkidle')

    // Manual override indicator should be gone
    await expect(overriddenAlbum.locator('[data-testid="manual-override-indicator"]')).not.toBeVisible()

    // Clear override button should be hidden
    await expect(clearButton).not.toBeVisible()
  })

  test('should persist manual override across page reload', async ({ page }) => {
    // Navigate to collection and artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    const artistName = await artistCard.locator('[data-testid="artist-name"]').textContent()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Find a Missing album
    const missingAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('text=/Missing/i'),
    }).first()
    const albumTitle = await missingAlbum.locator('[data-testid="album-title"]').textContent()

    // Toggle ownership to create manual override
    await missingAlbum.locator('[data-testid="toggle-ownership-button"]').click()
    await page.waitForLoadState('networkidle')

    // Verify manual override indicator is present
    await expect(missingAlbum.locator('[data-testid="manual-override-indicator"]')).toBeVisible()
    const statusAfterToggle = await missingAlbum.locator('[data-testid="ownership-status"]').textContent()

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate back to the same artist
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')
    await page.click(`text=${artistName}`)
    await page.waitForLoadState('networkidle')

    // Find the same album
    const reloadedAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator(`text=${albumTitle}`),
    }).first()

    // Manual override should still be present
    await expect(reloadedAlbum.locator('[data-testid="manual-override-indicator"]')).toBeVisible()

    // Ownership status should be the same
    const statusAfterReload = await reloadedAlbum.locator('[data-testid="ownership-status"]').textContent()
    expect(statusAfterReload).toBe(statusAfterToggle)
  })

  test('should show parent directory option in directory browser', async ({ page }) => {
    // Navigate to directory browser
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    const missingAlbum = page.locator('[data-testid="album-card"]').filter({
      has: page.locator('text=/Missing/i'),
    }).first()
    await missingAlbum.locator('[data-testid="link-folder-button"]').click()

    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Navigate into a subdirectory
    const directoryList = dialog.locator('[data-testid="directory-list"]')
    const firstDirectory = directoryList.locator('[data-testid="directory-item"]').first()
    await firstDirectory.dblclick()
    await page.waitForLoadState('networkidle')

    // Parent directory option should be visible
    const parentOption = directoryList.locator('[data-testid="parent-directory-item"]')
    await expect(parentOption).toBeVisible()
    await expect(parentOption).toContainText('..')

    // Click parent to go back
    await parentOption.dblclick()
    await page.waitForLoadState('networkidle')

    // Should be back at original directory
    await expect(parentOption).not.toBeVisible()
  })
})
