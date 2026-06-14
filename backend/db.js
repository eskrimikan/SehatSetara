const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

function buildPoolConfig() {
  const baseConfig = {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'sehatsetara',
  };

  if (process.env.DATABASE_URL) {
    return [{ connectionString: process.env.DATABASE_URL }];
  }

  return [
    {
      ...baseConfig,
      user: process.env.PGUSER || 'sehatsetara',
      password: process.env.PGPASSWORD || 'sehatsetara',
    },
    {
      ...baseConfig,
      user: 'postgres',
      password: 'sehatsetara',
    },
    {
      ...baseConfig,
      user: 'postgres',
      password: 'postgres',
    },
    {
      ...baseConfig,
      user: 'sehatsetara',
      password: 'postgres',
    },
  ];
}

async function connectPool() {
  const configs = buildPoolConfig();
  let lastError = null;

  for (const config of configs) {
    const candidatePool = new Pool(config);
    try {
      await candidatePool.query('SELECT 1');
      return candidatePool;
    } catch (error) {
      lastError = error;
      await candidatePool.end().catch(() => {});
    }
  }

  throw lastError || new Error('Tidak dapat terhubung ke PostgreSQL');
}

let pool;

function toPgQuery(sql) {
  let index = 0;
  return String(sql).replace(/\?/g, () => `$${++index}`);
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      is_approved BOOLEAN NOT NULL DEFAULT TRUE,
      requested_role TEXT NOT NULL DEFAULT '',
      full_name TEXT DEFAULT '',
      age TEXT DEFAULT '',
      province TEXT DEFAULT '',
      city TEXT DEFAULT '',
      district TEXT DEFAULT '',
      hospital_name TEXT DEFAULT '',
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role TEXT NOT NULL DEFAULT ''`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      media_path TEXT,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      actor_username TEXT NOT NULL DEFAULT '',
      actor_role TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      data BYTEA NOT NULL,
      uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS health_stat_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stat_date DATE NOT NULL,
      category_key TEXT NOT NULL,
      category_label TEXT NOT NULL,
      value BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, stat_date, category_key)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const doctorPassword = await bcrypt.hash('rahasia123', 10);
  await pool.query(
    `INSERT INTO users (username, password, role, is_approved, full_name)
     VALUES ($1, $2, $3, TRUE, $4)
     ON CONFLICT (username) DO UPDATE
       SET password = EXCLUDED.password,
           role = EXCLUDED.role,
           is_approved = TRUE,
           full_name = EXCLUDED.full_name`,
    ['dokter', doctorPassword, 'dokter', 'Dokter Demo'],
  );

  const superadminPassword = await bcrypt.hash('akuadmin', 10);
  await pool.query(
    `INSERT INTO users (username, password, role, is_approved, full_name)
     VALUES ($1, $2, $3, TRUE, $4)
     ON CONFLICT (username) DO UPDATE
       SET password = EXCLUDED.password,
           role = EXCLUDED.role,
           is_approved = TRUE,
           full_name = EXCLUDED.full_name`,
    ['admin', superadminPassword, 'superadmin', 'Super Admin'],
  );

  await pool.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES ($1, $2)
     ON CONFLICT (setting_key) DO NOTHING`,
    [
      'daily_health_tip',
      { title: 'Tidur 7–8 Jam Per Malam', desc: 'Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak.' },
    ],
  );

  await pool.query(`UPDATE users SET role = 'dokter' WHERE role = 'produsen'`);
}

const ready = (async () => {
  pool = await connectPool();
  await initSchema();
})();

function run(sql, params = [], callback) {
  const normalizedSql = /\breturning\b/i.test(sql) || !/^\s*(insert|update|delete)\b/i.test(sql)
    ? toPgQuery(sql)
    : `${toPgQuery(sql)} RETURNING id`;

  const promise = pool.query(normalizedSql, params);

  if (typeof callback === 'function') {
    promise.then((result) => {
      callback.call({ lastID: result.rows?.[0]?.id, changes: result.rowCount }, null);
    }).catch((error) => callback.call({ lastID: 0, changes: 0 }, error));
    return undefined;
  }

  return promise.then((result) => ({ lastID: result.rows?.[0]?.id, changes: result.rowCount }));
}

function get(sql, params = [], callback) {
  const promise = pool.query(toPgQuery(sql), params).then((result) => result.rows[0] || undefined);

  if (typeof callback === 'function') {
    promise.then((row) => callback(null, row)).catch((error) => callback(error));
    return undefined;
  }

  return promise;
}

function all(sql, params = [], callback) {
  const promise = pool.query(toPgQuery(sql), params).then((result) => result.rows);

  if (typeof callback === 'function') {
    promise.then((rows) => callback(null, rows)).catch((error) => callback(error));
    return undefined;
  }

  return promise;
}

module.exports = {
  pool,
  ready,
  query: (sql, params = []) => pool.query(toPgQuery(sql), params),
  run,
  get,
  all,
};
