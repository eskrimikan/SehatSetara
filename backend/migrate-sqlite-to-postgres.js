const path = require('path');
const sqlite3 = require('sqlite3');
const dbPg = require('./db');

function openSqlite(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

function allSqlite(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function firstOrNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

async function sqliteTableExists(db, tableName) {
  const rows = await allSqlite(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    [tableName],
  );
  return rows.length > 0;
}

async function migrate() {
  const sqlitePath = path.join(__dirname, 'database.db');
  console.log('Opening sqlite:', sqlitePath);

  const sqlite = await openSqlite(sqlitePath);

  // wait until Postgres DB ready and schema created
  try {
    await dbPg.ready;
  } catch (err) {
    console.error('Postgres not ready:', err);
    process.exit(1);
  }

  // USERS
  try {
    const users = await allSqlite(sqlite, 'SELECT * FROM users');
    console.log('Found users:', users.length);
    for (const u of users) {
      const params = [
        u.id,
        u.username,
        u.password,
        u.role || 'pengguna',
        u.is_approved ? true : false,
        u.full_name || '',
        u.age || '',
        u.province || '',
        u.city || '',
        u.district || '',
        u.hospital_name || '',
        firstOrNull(u.latitude),
        firstOrNull(u.longitude),
        firstOrNull(u.created_at) || new Date().toISOString(),
      ];
      await dbPg.run(
        `INSERT INTO users (id, username, password, role, is_approved, full_name, age, province, city, district, hospital_name, latitude, longitude, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           is_approved = EXCLUDED.is_approved,
           full_name = EXCLUDED.full_name,
           age = EXCLUDED.age,
           province = EXCLUDED.province,
           city = EXCLUDED.city,
           district = EXCLUDED.district,
           hospital_name = EXCLUDED.hospital_name,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           created_at = EXCLUDED.created_at`,
        params,
      );
    }
  } catch (err) {
    console.error('Error migrating users:', err);
  }

  // ARTICLES
  try {
    const articles = await allSqlite(sqlite, 'SELECT * FROM articles');
    console.log('Found articles:', articles.length);
    for (const a of articles) {
      const params = [
        a.id,
        a.title || '',
        a.content || '',
        firstOrNull(a.media_path),
        a.is_pinned ? true : false,
        firstOrNull(a.created_at) || new Date().toISOString(),
        firstOrNull(a.author_id),
      ];
      await dbPg.run(
        `INSERT INTO articles (id, title, content, media_path, is_pinned, created_at, author_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           media_path = EXCLUDED.media_path,
           is_pinned = EXCLUDED.is_pinned,
           created_at = EXCLUDED.created_at,
           author_id = EXCLUDED.author_id`,
        params,
      );
    }
  } catch (err) {
    console.error('Error migrating articles:', err);
  }

  // SITE SETTINGS
  try {
    if (await sqliteTableExists(sqlite, 'site_settings')) {
      const settings = await allSqlite(sqlite, 'SELECT * FROM site_settings');
      console.log('Found site_settings:', settings.length);
      for (const s of settings) {
        let value = s.setting_value;
        try { value = JSON.parse(value); } catch { /* keep as-is */ }
        await dbPg.run(
          `INSERT INTO site_settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [s.setting_key, value],
        );
      }
    } else {
      console.log('Skipping site_settings: table not found in sqlite');
    }
  } catch (err) {
    console.error('Error migrating site_settings:', err);
  }

  // AUDIT LOGS
  try {
    if (await sqliteTableExists(sqlite, 'audit_logs')) {
      const audits = await allSqlite(sqlite, 'SELECT * FROM audit_logs');
      console.log('Found audit_logs:', audits.length);
      for (const l of audits) {
        let metadata = l.metadata;
        try { metadata = JSON.parse(metadata); } catch { metadata = metadata || {}; }
        await dbPg.run(
          `INSERT INTO audit_logs (id, actor_id, actor_username, actor_role, action, target_type, target_id, metadata, ip_address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [l.id, firstOrNull(l.actor_id), l.actor_username || '', l.actor_role || '', l.action || '', l.target_type || '', l.target_id || '', metadata, l.ip_address || '', firstOrNull(l.created_at) || new Date().toISOString()],
        );
      }
    } else {
      console.log('Skipping audit_logs: table not found in sqlite');
    }
  } catch (err) {
    console.error('Error migrating audit_logs:', err);
  }

  // MEDIA ASSETS (attempt binary transfer)
  try {
    if (await sqliteTableExists(sqlite, 'media_assets')) {
      const medias = await allSqlite(sqlite, 'SELECT * FROM media_assets');
      console.log('Found media_assets:', medias.length);
      for (const m of medias) {
        const data = m.data || null; // sqlite3 returns Buffer for BLOB
        await dbPg.run(
          `INSERT INTO media_assets (id, filename, mime_type, byte_size, data, uploaded_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [m.id, m.filename || '', m.mime_type || '', m.byte_size || 0, data, firstOrNull(m.uploaded_by), firstOrNull(m.created_at) || new Date().toISOString()],
        );
      }
    } else {
      console.log('Skipping media_assets: table not found in sqlite');
    }
  } catch (err) {
    console.error('Error migrating media_assets:', err);
  }

  // Fix sequences
  try {
    await dbPg.query("SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM users), false))");
    await dbPg.query("SELECT setval(pg_get_serial_sequence('articles','id'), COALESCE((SELECT MAX(id) FROM articles), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM articles), false))");
    await dbPg.query("SELECT setval(pg_get_serial_sequence('media_assets','id'), COALESCE((SELECT MAX(id) FROM media_assets), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM media_assets), false))");
    console.log('Sequences fixed');
  } catch (err) {
    console.error('Error fixing sequences:', err);
  }

  sqlite.close();
  console.log('Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
