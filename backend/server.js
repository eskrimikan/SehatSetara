const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'sehatsetara-secret';
const SUPERADMIN_ROLE = 'superadmin';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function fetchJson(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Request gagal: ${response.status}`);
    }
    return data;
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Token diperlukan' });
  }

  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid' });
    }
    req.user = payload;
    next();
  });
}

function requireRole(roles) {
  const allowedRoles = new Set(Array.isArray(roles) ? roles : [roles]);
  return (req, res, next) => {
    if (!req.user || !allowedRoles.has(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  };
}

async function logAudit({ actorId = null, actorUsername = '', actorRole = '', action, targetType = '', targetId = '', metadata = {}, ipAddress = '' }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_username, actor_role, action, target_type, target_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [actorId, actorUsername, actorRole, action, targetType, targetId, metadata, ipAddress],
    );
  } catch {
    // Audit logging should never break the main request flow.
  }
}

function getRequestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const allowedRole = ['pengguna', 'dokter'].includes(role) ? role : 'pengguna';
    const trimmedUsername = String(username).trim();
    const existingUser = await db.get('SELECT id, role, is_approved FROM users WHERE username = ?', [trimmedUsername]);

    if (existingUser) {
      if (existingUser.role === 'dokter' && existingUser.is_approved === false && allowedRole === 'dokter') {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run('UPDATE users SET password = ?, role = ?, is_approved = FALSE WHERE id = ?', [hashedPassword, allowedRole, existingUser.id]);
        await logAudit({
          actorId: existingUser.id,
          actorUsername: trimmedUsername,
          actorRole: allowedRole,
          action: 'register_resubmit',
          targetType: 'user',
          targetId: String(existingUser.id),
          metadata: { role: allowedRole },
          ipAddress: getRequestIp(req),
        });
        return res.status(200).json({
          message: 'Pendaftaran dokter diperbarui dan menunggu persetujuan admin',
          userId: existingUser.id,
          isApproved: false,
        });
      }

      return res.status(409).json({ error: 'Username sudah dipakai' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = allowedRole === 'pengguna';
    const query = 'INSERT INTO users (username, password, role, is_approved) VALUES (?, ?, ?, ?)';

    db.run(query, [trimmedUsername, hashedPassword, allowedRole, isApproved ? 1 : 0], function(err) {
      if (err) {
        return res.status(400).json({ error: 'Username sudah dipakai' });
      }
      logAudit({
        actorId: this.lastID,
        actorUsername: trimmedUsername,
        actorRole: allowedRole,
        action: 'register',
        targetType: 'user',
        targetId: String(this.lastID || ''),
        metadata: { role: allowedRole },
        ipAddress: getRequestIp(req),
      });
      res.status(201).json({ message: isApproved ? 'Registrasi sukses' : 'Pendaftaran dokter menunggu persetujuan admin', userId: this.lastID, isApproved });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error di server.' });
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Error di server.' });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.is_approved === false) {
      return res.status(403).json({ error: user.role === 'dokter' ? 'Akun dokter menunggu persetujuan admin' : 'Akun belum disetujui' });
    }

    const passwordValid = bcrypt.compareSync(password, user.password);
    if (!passwordValid) return res.status(401).json({ error: 'Password salah' });

    logAudit({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'login',
      targetType: 'auth',
      targetId: String(user.id),
      metadata: { username: user.username },
      ipAddress: getRequestIp(req),
    });

    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET_KEY, { expiresIn: '1d' });
    res.json({
      token,
      role: user.role,
      username: user.username,
      profile: {
        fullName: user.full_name || '',
        age: user.age || '',
        province: user.province || '',
        city: user.city || '',
        district: user.district || '',
        hospitalName: user.hospital_name || '',
      },
    });
  });
});

app.get('/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT username, full_name, age, province, city, district, hospital_name FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Gagal memuat profil' });
      if (!user) return res.status(404).json({ error: 'Profil tidak ditemukan' });

      res.json({
        username: user.username,
        fullName: user.full_name || '',
        age: user.age || '',
        province: user.province || '',
        city: user.city || '',
        district: user.district || '',
        hospitalName: user.hospital_name || '',
      });
    },
  );
});

app.put('/profile', authenticateToken, (req, res) => {
  const { fullName = '', age = '', province = '', city = '', district = '', hospitalName = '' } = req.body || {};

  db.run(
    `UPDATE users
     SET full_name = ?, age = ?, province = ?, city = ?, district = ?, hospital_name = ?
     WHERE id = ?`,
    [fullName, age, province, city, district, hospitalName, req.user.id],
    async (err) => {
      if (err) return res.status(500).json({ error: 'Gagal menyimpan profil' });
      await logAudit({
        actorId: req.user.id,
        actorUsername: req.user.username || '',
        actorRole: req.user.role || '',
        action: 'profile_update',
        targetType: 'profile',
        targetId: String(req.user.id),
        metadata: { fullName, province, city, district, hospitalName },
        ipAddress: getRequestIp(req),
      });
      res.json({ message: 'Profil berhasil diperbarui' });
    },
  );
});

app.post('/articles', authenticateToken, upload.none(), (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Judul dan isi artikel wajib diisi' });
  }

  const canPublish = ['dokter', 'produsen', 'superadmin'].includes(req.user.role);
  if (!canPublish) {
    return res.status(403).json({ error: 'Role ini tidak boleh publish artikel' });
  }

  const query = 'INSERT INTO articles (title, content, media_path, created_at, author_id) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)';
  db.run(query, [title, content, null, req.user.id], async function(err) {
    if (err) return res.status(500).json({ error: 'Gagal menyimpan artikel' });
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'article_create',
      targetType: 'article',
      targetId: String(this.lastID || ''),
      metadata: { title },
      ipAddress: getRequestIp(req),
    });
    res.status(201).json({ message: 'Artikel berhasil dibuat', articleId: this.lastID });
  });
});

app.post('/media', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File media wajib dipilih' });
    }

    const result = await db.query(
      `INSERT INTO media_assets (filename, mime_type, byte_size, data, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer, req.user.id],
    );

    const mediaId = result.rows?.[0]?.id;
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'media_upload',
      targetType: 'media',
      targetId: String(mediaId || ''),
      metadata: { filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size },
      ipAddress: getRequestIp(req),
    });
    res.status(201).json({
      message: 'Media berhasil diunggah',
      id: mediaId,
      url: `/media/${mediaId}`,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menyimpan media' });
  }
});

app.get('/media/:id', async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
    if (!media) {
      return res.status(404).json({ error: 'Media tidak ditemukan' });
    }

    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${String(media.filename || `media-${media.id}`)}"`);
    res.send(media.data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat media' });
  }
});

app.get('/articles', (_req, res) => {
  const query = `
    SELECT
      articles.*,
      users.username AS author_name,
      users.role AS author_role,
      COALESCE(NULLIF(users.full_name, ''), users.username) AS author_full_name,
      users.province AS author_province,
      users.city AS author_city,
      users.district AS author_district,
      users.hospital_name AS author_hospital_name
    FROM articles
    JOIN users ON articles.author_id = users.id
    ORDER BY articles.is_pinned DESC, articles.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Gagal memuat artikel' });
    res.json(rows);
  });
});

app.get('/site/daily-tip', async (_req, res) => {
  try {
    const row = await db.get('SELECT setting_value FROM site_settings WHERE setting_key = ?', ['daily_health_tip']);
    const tip = row?.setting_value || { title: 'Tidur 7–8 Jam Per Malam', desc: 'Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak.' };
    res.json(tip);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat tips kesehatan' });
  }
});

app.put('/site/daily-tip', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const desc = String(req.body?.desc || '').trim();

    if (!title || !desc) {
      return res.status(400).json({ error: 'Judul dan deskripsi tips wajib diisi' });
    }

    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (setting_key) DO UPDATE
         SET setting_value = EXCLUDED.setting_value,
             updated_at = NOW()`,
      ['daily_health_tip', { title, desc }],
    );

    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'daily_tip_update',
      targetType: 'site_settings',
      targetId: 'daily_health_tip',
      metadata: { title, desc },
      ipAddress: getRequestIp(req),
    });

    res.json({ message: 'Tips kesehatan berhasil diperbarui', title, desc });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui tips kesehatan' });
  }
});

app.get('/admin/users', authenticateToken, requireRole(SUPERADMIN_ROLE), async (_req, res) => {
  try {
    const users = await db.all(
      `SELECT id, username, role, is_approved, full_name, hospital_name, created_at
       FROM users
       ORDER BY id DESC`,
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat daftar user' });
  }
});

app.patch('/admin/users/:id/status', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    const isApproved = Boolean(req.body?.isApproved);
    await db.run('UPDATE users SET is_approved = ? WHERE id = ?', [isApproved, req.params.id]);
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: isApproved ? 'user_approve' : 'user_suspend',
      targetType: 'user',
      targetId: String(req.params.id),
      metadata: { isApproved },
      ipAddress: getRequestIp(req),
    });
    res.json({ message: 'Status akun berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui status akun' });
  }
});

app.post('/admin/users/:id/reset-password', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    const nextPassword = String(req.body?.password || '').trim();
    if (!nextPassword) {
      return res.status(400).json({ error: 'Password baru wajib diisi' });
    }

    const hashedPassword = await bcrypt.hash(nextPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'password_reset',
      targetType: 'user',
      targetId: String(req.params.id),
      metadata: { passwordReset: true },
      ipAddress: getRequestIp(req),
    });
    res.json({ message: 'Password berhasil direset' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mereset password' });
  }
});

app.get('/admin/articles', authenticateToken, requireRole(SUPERADMIN_ROLE), async (_req, res) => {
  try {
    const rows = await db.all(
      `SELECT articles.id, articles.title, articles.content, articles.is_pinned, articles.created_at, users.username AS author_name, users.role AS author_role
       FROM articles
       JOIN users ON articles.author_id = users.id
       ORDER BY articles.is_pinned DESC, articles.id DESC`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat daftar artikel' });
  }
});

app.patch('/admin/articles/:id/pin', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    const isPinned = Boolean(req.body?.isPinned);
    await db.run('UPDATE articles SET is_pinned = ? WHERE id = ?', [isPinned, req.params.id]);
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: isPinned ? 'article_pin' : 'article_unpin',
      targetType: 'article',
      targetId: String(req.params.id),
      metadata: { isPinned },
      ipAddress: getRequestIp(req),
    });
    res.json({ message: 'Status pin artikel diperbarui' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memperbarui pin artikel' });
  }
});

app.put('/admin/articles/:id', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi artikel wajib diisi' });
    }

    await db.run('UPDATE articles SET title = ?, content = ? WHERE id = ?', [title, content, req.params.id]);
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'article_force_edit',
      targetType: 'article',
      targetId: String(req.params.id),
      metadata: { title },
      ipAddress: getRequestIp(req),
    });
    res.json({ message: 'Artikel berhasil diedit' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengedit artikel' });
  }
});

app.delete('/admin/articles/:id', authenticateToken, requireRole(SUPERADMIN_ROLE), async (req, res) => {
  try {
    await db.run('DELETE FROM articles WHERE id = ?', [req.params.id]);
    await logAudit({
      actorId: req.user.id,
      actorUsername: req.user.username || '',
      actorRole: req.user.role || '',
      action: 'article_takedown',
      targetType: 'article',
      targetId: String(req.params.id),
      metadata: {},
      ipAddress: getRequestIp(req),
    });
    res.json({ message: 'Artikel berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: 'Gagal menghapus artikel' });
  }
});

app.get('/admin/audit-logs', authenticateToken, requireRole(SUPERADMIN_ROLE), async (_req, res) => {
  try {
    const rows = await db.all(
      `SELECT id, actor_username, actor_role, action, target_type, target_id, metadata, ip_address, created_at
       FROM audit_logs
       ORDER BY id DESC
       LIMIT 100`,
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat audit log' });
  }
});

app.get('/debug/database', async (_req, res) => {
  try {
    const [userCount, articleCount, mediaCount, latestArticle] = await Promise.all([
      db.get('SELECT COUNT(*)::int AS total FROM users'),
      db.get('SELECT COUNT(*)::int AS total FROM articles'),
      db.get('SELECT COUNT(*)::int AS total FROM media_assets'),
      db.get(
        `SELECT articles.id, articles.title, articles.created_at, users.username AS author_name
         FROM articles
         JOIN users ON articles.author_id = users.id
         ORDER BY articles.id DESC
         LIMIT 1`,
      ),
    ]);

    res.json({
      database: process.env.PGDATABASE || (process.env.DATABASE_URL ? 'DATABASE_URL' : 'sehatsetara'),
      userCount: userCount?.total || 0,
      articleCount: articleCount?.total || 0,
      mediaCount: mediaCount?.total || 0,
      latestArticle: latestArticle || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memeriksa database' });
  }
});

app.get('/regions/provinces', async (_req, res) => {
  try {
    const data = await fetchJson('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat provinsi' });
  }
});

app.get('/regions/cities/:provinceId', async (req, res) => {
  try {
    const data = await fetchJson(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${req.params.provinceId}.json`);
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat kota/kabupaten' });
  }
});

app.get('/regions/districts/:cityId', async (req, res) => {
  try {
    const data = await fetchJson(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${req.params.cityId}.json`);
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat kecamatan' });
  }
});

app.get('/regions/hospitals', async (req, res) => {
  try {
    const province = String(req.query.province || '').trim();
    const city = String(req.query.city || '').trim();
    const district = String(req.query.district || '').trim();

    if (!province || !city || !district) {
      return res.status(400).json({ error: 'Provinsi, kota, dan kecamatan wajib diisi' });
    }

    const search = encodeURIComponent(`${district}, ${city}, ${province}, Indonesia`);
    const location = await fetchJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${search}`, {
      headers: { 'User-Agent': 'SehatSetara/1.0' },
    });

    const first = Array.isArray(location) ? location[0] : null;
    if (!first?.boundingbox) return res.json([]);

    const [south, north, west, east] = first.boundingbox.map((value) => Number(value));
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node["amenity"="hospital"](${south},${west},${north},${east});
        way["amenity"="hospital"](${south},${west},${north},${east});
        relation["amenity"="hospital"](${south},${west},${north},${east});
        node["healthcare"="hospital"](${south},${west},${north},${east});
        way["healthcare"="hospital"](${south},${west},${north},${east});
        relation["healthcare"="hospital"](${south},${west},${north},${east});
      );
      out center tags;
    `;

    const overpass = await fetchJson('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'SehatSetara/1.0',
      },
      body: new URLSearchParams({ data: overpassQuery }),
    });

    const hospitals = Array.isArray(overpass?.elements)
      ? overpass.elements
          .map((item) => {
            const tags = item.tags || {};
            const lat = Number(item.lat || item.center?.lat || 0);
            const lng = Number(item.lon || item.center?.lon || 0);
            return {
              id: String(item.id || `${lat}-${lng}`),
              name: String(tags.name || tags.operator || 'Rumah sakit tanpa nama'),
              address: [tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ') || 'Alamat belum tercatat',
              lat,
              lng,
            };
          })
          .filter((item) => item.lat && item.lng)
      : [];

    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat rumah sakit' });
  }
});

app.post('/faskes/nearby', async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const radius = Number(req.body?.radius || 6000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Koordinat lokasi tidak valid' });
    }

    const overpassQuery = `
      [out:json][timeout:30];
      (
        node(around:${radius},${lat},${lng})["amenity"~"hospital|clinic|pharmacy|doctors"];
        way(around:${radius},${lat},${lng})["amenity"~"hospital|clinic|pharmacy|doctors"];
        relation(around:${radius},${lat},${lng})["amenity"~"hospital|clinic|pharmacy|doctors"];
        node(around:${radius},${lat},${lng})["healthcare"~"hospital|clinic|centre|midwife|doctor"];
        way(around:${radius},${lat},${lng})["healthcare"~"hospital|clinic|centre|midwife|doctor"];
        relation(around:${radius},${lat},${lng})["healthcare"~"hospital|clinic|centre|midwife|doctor"];
        node(around:${radius},${lat},${lng})["office"="midwife"];
        way(around:${radius},${lat},${lng})["office"="midwife"];
        relation(around:${radius},${lat},${lng})["office"="midwife"];
      );
      out center tags;
    `;

    const overpass = await fetchJson('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'SehatSetara/1.0',
      },
      body: new URLSearchParams({ data: overpassQuery }),
    });

    const distanceKm = (aLat, aLng, bLat, bLng) => {
      const R = 6371;
      const toRad = (value) => (value * Math.PI) / 180;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const lat1 = toRad(aLat);
      const lat2 = toRad(bLat);
      const sinLat = Math.sin(dLat / 2);
      const sinLng = Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng), Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng));
      return R * c;
    };

    const classify = (tags, name) => {
      const combined = `${name} ${tags.amenity || ''} ${tags.healthcare || ''} ${tags.office || ''}`.toLowerCase();
      if (combined.includes('puskesmas')) return 'puskesmas';
      if (tags.amenity === 'hospital' || combined.includes('rumah sakit')) return 'rs';
      if (tags.amenity === 'pharmacy') return 'apotek';
      if (tags.healthcare === 'midwife' || tags.office === 'midwife') return 'bidan';
      if (tags.amenity === 'clinic' || tags.healthcare === 'clinic' || tags.healthcare === 'centre' || tags.amenity === 'doctors') return 'klinik';
      return null;
    };

    const facilities = Array.isArray(overpass?.elements)
      ? overpass.elements
          .map((item) => {
            const tags = item.tags || {};
            const name = String(tags.name || tags.operator || 'Faskes tanpa nama');
            const type = classify(tags, name);
            if (!type) return null;

            const facilityLat = Number(item.lat || item.center?.lat || 0);
            const facilityLng = Number(item.lon || item.center?.lon || 0);
            const distance = distanceKm(lat, lng, facilityLat, facilityLng);

            return {
              id: String(item.id || `${facilityLat}-${facilityLng}`),
              name,
              type,
              address: [tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:province']].filter(Boolean).join(', ') || tags['addr:full'] || 'Alamat belum tercatat',
              phone: String(tags['contact:phone'] || tags.phone || ''),
              hours: String(tags.opening_hours || tags['opening_hours:covid19'] || ''),
              lat: facilityLat,
              lng: facilityLng,
              distance: Number(distance.toFixed(1)),
              isOpen: String(tags.opening_hours || '').includes('24') || String(tags.opening_hours || '').toLowerCase().includes('open'),
              source: 'openstreetmap',
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.distance - b.distance)
      : [];

    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat data faskes' });
  }
});

db.ready
  .then(() => {
    app.listen(8080, () => console.log('SERVER SEHATSETARA NYALA DI PORT 8080'));
  })
  .catch((error) => {
    console.error('Gagal menyiapkan database PostgreSQL:', error);
    process.exit(1);
  });
