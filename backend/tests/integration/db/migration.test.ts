/**
 * Database Migration Tests - is_ignored column
 *
 * Integration tests to verify is_ignored column migration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('is_ignored migration', () => {
  let db: Database.Database

  beforeEach(() => {
    // Create a fresh in-memory database
    db = new Database(':memory:')
  })

  it('should add is_ignored column to Album table when migration runs', () => {
    // Create old schema without is_ignored column
    db.exec(`
      CREATE TABLE Album (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER NOT NULL,
        mbid TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        ownership_status TEXT NOT NULL DEFAULT 'Missing',
        is_manual_override INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Verify column doesn't exist
    const columnsBefore = db.pragma('table_info(Album)') as Array<{ name: string }>
    expect(columnsBefore.some(col => col.name === 'is_ignored')).toBe(false)

    // Run migration
    const hasIsIgnored = columnsBefore.some(col => col.name === 'is_ignored')
    if (!hasIsIgnored) {
      db.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0')
    }

    // Verify column now exists
    const columnsAfter = db.pragma('table_info(Album)') as Array<{ name: string; dflt_value: string | null }>
    const isIgnoredColumn = columnsAfter.find(col => col.name === 'is_ignored')

    expect(isIgnoredColumn).toBeDefined()
    expect(isIgnoredColumn?.dflt_value).toBe('0')
  })

  it('should be idempotent (safe to run multiple times)', () => {
    // Create old schema
    db.exec(`
      CREATE TABLE Album (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER NOT NULL,
        mbid TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        ownership_status TEXT NOT NULL DEFAULT 'Missing',
        is_manual_override INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    // Run migration twice
    const runMigration = () => {
      const columns = db.pragma('table_info(Album)') as Array<{ name: string }>
      const hasIsIgnored = columns.some(col => col.name === 'is_ignored')
      if (!hasIsIgnored) {
        db.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0')
      }
    }

    expect(() => {
      runMigration()
      runMigration() // Run twice
    }).not.toThrow()

    // Verify column exists once
    const columns = db.pragma('table_info(Album)') as Array<{ name: string }>
    const isIgnoredColumns = columns.filter(col => col.name === 'is_ignored')
    expect(isIgnoredColumns).toHaveLength(1)
  })

  it('should default is_ignored to 0 for existing albums', () => {
    // Create old schema and insert data
    db.exec(`
      CREATE TABLE Album (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artist_id INTEGER NOT NULL,
        mbid TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        ownership_status TEXT NOT NULL DEFAULT 'Missing',
        is_manual_override INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.prepare(`
      INSERT INTO Album (artist_id, mbid, title, ownership_status)
      VALUES (1, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Test Album', 'Missing')
    `).run()

    // Run migration
    db.exec('ALTER TABLE Album ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0')

    // Verify existing albums have is_ignored = 0
    const album = db.prepare('SELECT is_ignored FROM Album WHERE id = 1').get() as { is_ignored: number }
    expect(album.is_ignored).toBe(0)
  })
})
