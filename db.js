require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

let dbClient = null;

function initDB() {
  const url = process.env.DATABASE_URL || 'file:data/ircc_tracker.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // Warn loudly in production if remote DB env vars are missing
  if (!process.env.DATABASE_URL) {
    console.warn('[DB] WARNING: DATABASE_URL not set, falling back to local file. This will FAIL on Vercel.');
  }

  // Only attempt filesystem operations for local file DBs
  if (url.startsWith('file:') && !url.includes(':memory:')) {
    try {
      const dataPath = url.replace('file:', '');
      const dataDir = path.dirname(path.join(__dirname, dataPath));
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (e) {
      console.error('[DB] Could not create data directory (expected on Vercel):', e.message);
    }
  }

  dbClient = createClient({
    url,
    authToken
  });

  return new Promise(async (resolve, reject) => {
    try {
      // Create tables
      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          program_type TEXT NOT NULL,
          stream TEXT NOT NULL,
          noc_code TEXT NOT NULL,
          submission_date TEXT NOT NULL,
          work_permit_expiry TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Submitted',
          nominated_date TEXT,
          waiting_months REAL DEFAULT 0,
          days_remaining INTEGER DEFAULT 0,
          risk_level TEXT DEFAULT 'green',
          status_note TEXT,
          ns_graduate BOOLEAN DEFAULT 0,
          has_case_number BOOLEAN DEFAULT 0,
          case_number_date TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await dbClient.execute(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            active BOOLEAN DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Migration: Add columns if they don't exist
      try { await dbClient.execute("ALTER TABLE applications ADD COLUMN status_note TEXT"); } catch (e) { }
      try { await dbClient.execute("ALTER TABLE applications ADD COLUMN ns_graduate BOOLEAN DEFAULT 0"); } catch (e) { }
      try { await dbClient.execute("ALTER TABLE applications ADD COLUMN has_case_number BOOLEAN DEFAULT 0"); } catch (e) { }
      try { await dbClient.execute("ALTER TABLE applications ADD COLUMN case_number_date TEXT"); } catch (e) { }

      // Create indexes
      try { await dbClient.execute('CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id)'); } catch (e) { }
      try { await dbClient.execute('CREATE INDEX IF NOT EXISTS idx_applications_program ON applications(program_type, stream)'); } catch (e) { }
      try { await dbClient.execute('CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)'); } catch (e) { }
      try { await dbClient.execute('CREATE INDEX IF NOT EXISTS idx_applications_noc ON applications(noc_code)'); } catch (e) { }

      console.log(`[DB] Database initialized using ${url}`);
      resolve(dbClient);
    } catch (error) {
      console.error('[DB] Initialization error:', error);
      reject(error);
    }
  });
}

// Function left to satisfy existing dependencies.
// Turso syncs automatically or runs over HTTP so local save is not required in the same way sql.js needed it.
function saveDB() {
  // No-op for libsql
}

function getDB() {
  return dbClient;
}

// Helper functions that mimic better-sqlite3's API to keep the rest of the app unchanged
function prepare(sql) {
  return {
    async run(...params) {
      const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

      try {
        console.log(`[DB] RUN: ${sql.trim().substring(0, 50)}...`);
        const result = await dbClient.execute({ sql, args: flattenedParams });
        return {
          lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
          changes: result.rowsAffected
        };
      } catch (e) {
        console.error(`[DB Error - RUN]: ${e.message}`);
        throw e;
      }
    },
    async get(...params) {
      const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

      try {
        console.log(`[DB] GET: ${sql.trim().substring(0, 50)}...`);
        const result = await dbClient.execute({ sql, args: flattenedParams });
        if (result.rows && result.rows.length > 0) {
          return result.rows[0];
        }
        return undefined;
      } catch (e) {
        console.error(`[DB Error - GET]: ${e.message}`);
        throw e;
      }
    },
    async all(...params) {
      const flattenedParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
      try {
        const result = await dbClient.execute({ sql, args: flattenedParams });
        return result.rows || [];
      } catch (e) {
        console.error(`[DB Error - ALL]: ${e.message}`);
        throw e;
      }
    }
  };
}

module.exports = { initDB, getDB, saveDB, prepare };
