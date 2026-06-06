import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'lookahead.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      discipline TEXT NOT NULL,
      filename TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      week_label TEXT NOT NULL,
      lookahead_start TEXT,
      lookahead_end TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      work_front TEXT NOT NULL,
      general_title TEXT NOT NULL,
      description TEXT NOT NULL,
      resources TEXT NOT NULL DEFAULT '',
      scheduled_days TEXT NOT NULL DEFAULT '[]',
      start_date TEXT,
      end_date TEXT,
      duration_days INTEGER NOT NULL DEFAULT 0,
      discipline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source_file TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activities_snapshot ON activities(snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_activities_fingerprint ON activities(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_snapshots_project ON snapshots(project_id);
  `);

  // Lightweight migrations for pre-existing databases
  const snapCols = db.prepare(`PRAGMA table_info(snapshots)`).all() as { name: string }[];
  const hasCol = (name: string) => snapCols.some(c => c.name === name);
  if (!hasCol('lookahead_start')) {
    db.exec(`ALTER TABLE snapshots ADD COLUMN lookahead_start TEXT`);
  }
  if (!hasCol('lookahead_end')) {
    db.exec(`ALTER TABLE snapshots ADD COLUMN lookahead_end TEXT`);
  }

  console.log('Database initialized at', DB_PATH);
}

export default db;
