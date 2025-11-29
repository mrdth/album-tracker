import { test, expect } from '@playwright/test'

test.describe('Artist Folder Linking', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')

    // Wait for the app to load
    await page.waitForLoadState('networkidle')
  })

  test('should manually link artist folder', async ({ page }) => {
    // Navigate to collection
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    // Click on an artist to view details
    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    const artistName = await artistCard.locator('[data-testid="artist-name"]').textContent()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Find and click "Link Artist Folder" button
    const linkButton = page.locator('[data-testid="link-artist-folder-button"]')
    await expect(linkButton).toBeVisible()
    await linkButton.click()

    // Directory browser dialog should appear
    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()

    // Wait for directories to load
    await page.waitForLoadState('networkidle')

    // Navigate through directories
    const directoryList = dialog.locator('[data-testid="directory-list"]')
    await expect(directoryList).toBeVisible()

    // Select a folder by single-clicking
    const targetFolder = directoryList.locator('[data-testid="directory-item"]').first()
    await targetFolder.click()

    // Confirm selection
    await dialog.locator('[data-testid="confirm-selection-button"]').click()

    // Dialog should close
    await expect(dialog).not.toBeVisible()

    // Linked folder path should be displayed in artist header
    const linkedFolderIndicator = page.locator('[data-testid="linked-folder-path"]')
    await expect(linkedFolderIndicator).toBeVisible()
  })

  test('should clear linked artist folder', async ({ page }) => {
    // Navigate to collection and artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Link a folder first
    const linkButton = page.locator('[data-testid="link-artist-folder-button"]')
    await linkButton.click()

    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()
    await page.waitForLoadState('networkidle')

    const targetFolder = dialog.locator('[data-testid="directory-item"]').first()
    await targetFolder.click()
    await dialog.locator('[data-testid="confirm-selection-button"]').click()
    await expect(dialog).not.toBeVisible()

    // Wait for linked folder to be displayed
    const linkedFolderIndicator = page.locator('[data-testid="linked-folder-path"]')
    await expect(linkedFolderIndicator).toBeVisible()

    // Clear the link
    const clearButton = page.locator('[data-testid="clear-artist-folder-link-button"]')
    await expect(clearButton).toBeVisible()
    await clearButton.click()

    // Linked folder indicator should disappear
    await expect(linkedFolderIndicator).not.toBeVisible()

    // Link button should be visible again
    await expect(linkButton).toBeVisible()
  })

  test('should persist linked artist folder across page reload', async ({ page }) => {
    // Navigate to artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    const artistName = await artistCard.locator('[data-testid="artist-name"]').textContent()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Link a folder
    const linkButton = page.locator('[data-testid="link-artist-folder-button"]')
    await linkButton.click()

    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()
    await page.waitForLoadState('networkidle')

    const targetFolder = dialog.locator('[data-testid="directory-item"]').first()
    const folderName = await targetFolder.textContent()
    await targetFolder.click()
    await dialog.locator('[data-testid="confirm-selection-button"]').click()

    // Get the linked folder path
    const linkedFolderIndicator = page.locator('[data-testid="linked-folder-path"]')
    await expect(linkedFolderIndicator).toBeVisible()
    const linkedPath = await linkedFolderIndicator.textContent()

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate back to the same artist
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')
    await page.click(`text=${artistName}`)
    await page.waitForLoadState('networkidle')

    // Linked folder should still be displayed
    const reloadedIndicator = page.locator('[data-testid="linked-folder-path"]')
    await expect(reloadedIndicator).toBeVisible()
    const reloadedPath = await reloadedIndicator.textContent()
    expect(reloadedPath).toBe(linkedPath)
  })

  test('should use linked folder when scanning library', async ({ page }) => {
    // Navigate to artist detail
    await page.click('text=Collection')
    await page.waitForLoadState('networkidle')

    const artistCard = page.locator('[data-testid="artist-summary-card"]').first()
    await artistCard.click()
    await page.waitForLoadState('networkidle')

    // Link a folder
    const linkButton = page.locator('[data-testid="link-artist-folder-button"]')
    await linkButton.click()

    const dialog = page.locator('[data-testid="directory-browser-dialog"]')
    await expect(dialog).toBeVisible()
    await page.waitForLoadState('networkidle')

    const targetFolder = dialog.locator('[data-testid="directory-item"]').first()
    await targetFolder.click()
    await dialog.locator('[data-testid="confirm-selection-button"]').click()
    await expect(dialog).not.toBeVisible()

    // Trigger library scan
    const scanButton = page.locator('text=Scan Library')
    await scanButton.click()

    // Wait for scan to complete
    await page.waitForSelector('text=/Scan complete/i', { timeout: 30000 })

    // Verify that albums were scanned from the linked folder
    const albumCards = page.locator('[data-testid="album-card"]')
    const albumCount = await albumCards.count()
    expect(albumCount).toBeGreaterThan(0)
  })
})
