import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'campusconnect.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability and performance
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('STUDENT', 'ORGANIZER')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    capacity INTEGER NOT NULL CHECK(capacity > 0),
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    organizer_id TEXT NOT NULL REFERENCES users(id),
    organizer_name TEXT NOT NULL,
    registration_deadline TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'WAITLISTED', 'CANCELLED')),
    registered_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_events (
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (student_id, event_id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
  CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
  CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
  CREATE INDEX IF NOT EXISTS idx_registrations_order ON registrations(registered_at ASC);
  CREATE INDEX IF NOT EXISTS idx_saved_student ON saved_events(student_id);
`);

// Safe migrations for price, tags, and payment fields
try {
  db.exec('ALTER TABLE events ADD COLUMN price REAL DEFAULT 0.0;');
} catch (_) {}

try {
  db.exec("ALTER TABLE events ADD COLUMN tags TEXT DEFAULT '';");
} catch (_) {}

try {
  db.exec('ALTER TABLE registrations ADD COLUMN amount_paid REAL DEFAULT 0.0;');
} catch (_) {}

try {
  db.exec("ALTER TABLE registrations ADD COLUMN payment_status TEXT DEFAULT 'FREE';");
} catch (_) {}

/**
 * Executes a function within an atomic transaction.
 * Automatically commits on success and rolls back on error.
 */
export function runTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}
