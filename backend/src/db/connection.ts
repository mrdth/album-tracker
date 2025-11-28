/**
 * Database Connection Module
 *
 * Provides a singleton SQLite database connection with:
 * - WAL mode for better concurrency
 * - Foreign key enforcement
 * - Automatic schema initialization
 * - Default settings row creation
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../album-tracker.db');
const SCHEMA_PATH = join(__dirname, 'schema.sql');

let db: Database.Database | null = null;

/**
 * Get or create the singleton database connection
 */
export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Create database connection
  db = new Database(DB_PATH);

  // Configure database for optimal performance and safety
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrency
  db.pragma('foreign_keys = ON');  // Enforce foreign key constraints
  db.pragma('synchronous = NORMAL'); // Balance safety/performance

  // Initialize schema
  initializeSchema(db);

  // Initialize default settings if needed
  initializeDefaultSettings(db);

  return db;
}

/**
 * Initialize database schema from schema.sql
 */
function initializeSchema(database: Database.Database): void {
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  database.exec(schema);
}

/**
 * Initialize default Settings row if it doesn't exist
 */
function initializeDefaultSettings(database: Database.Database): void {
  const settingsExist = database
    .prepare('SELECT COUNT(*) as count FROM Settings')
    .get() as { count: number };

  if (settingsExist.count === 0) {
    const defaultLibraryPath = process.env.LIBRARY_ROOT_PATH || '/music';

    database
      .prepare(`
        INSERT INTO Settings (id, library_root_path, similarity_threshold, api_rate_limit_ms, max_api_retries)
        VALUES (1, ?, 0.80, 1000, 3)
      `)
      .run(defaultLibraryPath);

    console.log(`[DB] Initialized default Settings with library_root_path: ${defaultLibraryPath}`);
  }
}

/**
 * Close the database connection
 * Should be called on application shutdown
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database connection closed');
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export function transaction<T>(
  fn: (db: Database.Database) => T
): T {
  const database = getDatabase();
  return database.transaction(fn)(database);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
