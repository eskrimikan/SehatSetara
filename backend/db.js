const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const SQLITE_PATH = path.join(__dirname, 'database.db');
const database = new sqlite3.Database(SQLITE_PATH);

database.exec('PRAGMA foreign_keys = ON');

function toSqliteQuery(sql) {
  return String(sql)
    .replace(/\$\d+/g, '?')
    .replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/::int\b/gi, '')
    .replace(/::jsonb\b/gi, '')
    .replace(/COUNT\(\*\) FILTER \(WHERE value = TRUE\)::int/gi, 'SUM(CASE WHEN value IN (1, "1", TRUE, "true") THEN 1 ELSE 0 END)')
    .replace(/to_char\(stat_date,\s*'YYYY-MM'\)/gi, "strftime('%Y-%m', stat_date)")
    .replace(/to_char\(stat_date,\s*'YYYY'\)/gi, "strftime('%Y', stat_date)")
    .replace(/::text\b/gi, '')
    .replace(/BOOLEAN NOT NULL DEFAULT TRUE/gi, 'INTEGER NOT NULL DEFAULT 1')
    .replace(/BOOLEAN NOT NULL DEFAULT FALSE/gi, 'INTEGER NOT NULL DEFAULT 0')
    .replace(/BOOLEAN NOT NULL DEFAULT TRUE/gi, 'INTEGER NOT NULL DEFAULT 1')
    .replace(/BOOLEAN/gi, 'INTEGER')
    .replace(/TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/gi, 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP')
    .replace(/DOUBLE PRECISION/gi, 'REAL')
    .replace(/BYTEA/gi, 'BLOB')
    .replace(/JSONB NOT NULL DEFAULT '\{\}'::jsonb/gi, 'TEXT NOT NULL DEFAULT "{}"')
    .replace(/ON CONFLICT \(setting_key\) DO NOTHING/gi, 'ON CONFLICT(setting_key) DO NOTHING')
    .replace(/ON CONFLICT \(username\) DO UPDATE/gi, 'ON CONFLICT(username) DO UPDATE')
    .replace(/excluded\./gi, 'excluded.')
    .replace(/CURRENT_TIMESTAMP\(\)/gi, 'CURRENT_TIMESTAMP');
}

function normalizeParam(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function normalizeRow(row) {
  if (!row) {
    return row;
  }

  const normalized = { ...row };
  for (const key of ['is_approved', 'is_pinned', 'value']) {
    if (key in normalized) {
      const current = normalized[key];
      normalized[key] = current === 1 || current === '1' || current === true || current === 'true';
    }
  }

  for (const key of ['setting_value', 'metadata']) {
    if (typeof normalized[key] === 'string') {
      try {
        normalized[key] = JSON.parse(normalized[key]);
      } catch {
        // Leave the raw value intact if the column is not JSON.
      }
    }
  }

  return normalized;
}

function all(sql, params = [], callback) {
  const normalizedSql = toSqliteQuery(sql);
  const normalizedParams = params.map(normalizeParam);
  const promise = new Promise((resolve, reject) => {
    database.all(normalizedSql, normalizedParams, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve((rows || []).map(normalizeRow));
    });
  });

  if (typeof callback === 'function') {
    promise.then((rows) => callback(null, rows)).catch((error) => callback(error));
    return undefined;
  }

  return promise;
}

function get(sql, params = [], callback) {
  const normalizedSql = toSqliteQuery(sql);
  const normalizedParams = params.map(normalizeParam);
  const promise = new Promise((resolve, reject) => {
    database.get(normalizedSql, normalizedParams, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(normalizeRow(row));
    });
  });

  if (typeof callback === 'function') {
    promise.then((row) => callback(null, row)).catch((error) => callback(error));
    return undefined;
  }

  return promise;
}

function run(sql, params = [], callback) {
  const normalizedSql = toSqliteQuery(sql);
  const normalizedParams = params.map(normalizeParam);
  const promise = new Promise((resolve, reject) => {
    database.run(normalizedSql, normalizedParams, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID || 0, changes: this.changes || 0 });
    });
  });

  if (typeof callback === 'function') {
    promise.then((result) => callback.call({ lastID: result.lastID, changes: result.changes }, null)).catch((error) => callback.call({ lastID: 0, changes: 0 }, error));
    return undefined;
  }

  return promise;
}

function isReadQuery(sql) {
  return /^\s*(select|with|pragma)\b/i.test(String(sql)) || /\breturning\b/i.test(String(sql));
}

function execute(sql, params = []) {
  const normalizedSql = toSqliteQuery(sql);
  const normalizedParams = params.map(normalizeParam);

  if (isReadQuery(normalizedSql)) {
    return all(normalizedSql, normalizedParams).then((rows) => ({ rows, rowCount: rows.length }));
  }

  return run(normalizedSql, normalizedParams).then((result) => ({ rows: [], rowCount: result.changes, lastID: result.lastID, changes: result.changes }));
}

async function ensureColumn(table, columnSql, columnName) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((column) => column.name === columnName)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${columnSql}`);
  }
}

async function initSchema() {
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 1,
      requested_role TEXT NOT NULL DEFAULT '',
      full_name TEXT DEFAULT '',
      age TEXT DEFAULT '',
      province TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      hospital_name TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      media_path TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_username TEXT NOT NULL DEFAULT '',
      actor_role TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}',
      ip_address TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      data BLOB NOT NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS health_stat_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stat_date TEXT NOT NULL,
      category_key TEXT NOT NULL,
      category_label TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, stat_date, category_key)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn('users', "requested_role TEXT NOT NULL DEFAULT ''", 'requested_role');
  await ensureColumn('users', "full_name TEXT DEFAULT ''", 'full_name');
  await ensureColumn('users', "age TEXT DEFAULT ''", 'age');
  await ensureColumn('users', "province TEXT DEFAULT ''", 'province');
  await ensureColumn('users', "city TEXT DEFAULT ''", 'city');
  await ensureColumn('users', "district TEXT DEFAULT ''", 'district');
  await ensureColumn('users', "hospital_name TEXT DEFAULT ''", 'hospital_name');
  await ensureColumn('users', 'latitude REAL', 'latitude');
  await ensureColumn('users', 'longitude REAL', 'longitude');
  await ensureColumn('articles', 'media_path TEXT', 'media_path');
  await ensureColumn('articles', 'is_pinned INTEGER NOT NULL DEFAULT 0', 'is_pinned');
  await ensureColumn('articles', 'created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP', 'created_at');
  await ensureColumn('articles', 'author_id INTEGER NOT NULL DEFAULT 1', 'author_id');

  const doctorPassword = await bcrypt.hash('rahasia123', 10);
  await run(
    `INSERT INTO users (username, password, role, is_approved, full_name)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(username) DO UPDATE SET
       password = excluded.password,
       role = excluded.role,
       is_approved = 1,
       full_name = excluded.full_name`,
    ['dokter', doctorPassword, 'dokter', 'Dokter Demo'],
  );

  const superadminPassword = await bcrypt.hash('akuadmin', 10);
  await run(
    `INSERT INTO users (username, password, role, is_approved, full_name)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(username) DO UPDATE SET
       password = excluded.password,
       role = excluded.role,
       is_approved = 1,
       full_name = excluded.full_name`,
    ['admin', superadminPassword, 'superadmin', 'Super Admin'],
  );

  await run(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON CONFLICT(setting_key) DO NOTHING`,
    [
      'daily_health_tip',
      { title: 'Tidur 7–8 Jam Per Malam', desc: 'Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak.' },
    ],
  );

  await run(`UPDATE users SET role = 'dokter' WHERE role = 'produsen'`);
}

const ready = initSchema().catch((error) => {
  console.error('Gagal menyiapkan database lokal:', error);
  throw error;
});

module.exports = {
  pool: database,
  ready,
  query: execute,
  run,
  get,
  all,
};
