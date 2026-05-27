const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || 'sehatsetara-secret';

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_.-]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });
app.use('/uploads', express.static(uploadDir));

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

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, password, role, is_approved) VALUES (?, ?, ?, 1)';

    db.run(query, [username, hashedPassword, role || 'pengguna'], function(err) {
      if (err) return res.status(400).json({ error: 'Username sudah dipakai' });
      res.status(201).json({ message: 'Registrasi sukses', userId: this.lastID });
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

    const passwordValid = bcrypt.compareSync(password, user.password);
    if (!passwordValid) return res.status(401).json({ error: 'Password salah' });

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
    (err) => {
      if (err) return res.status(500).json({ error: 'Gagal menyimpan profil' });
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
  db.run(query, [title, content, null, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Gagal menyimpan artikel' });
    res.status(201).json({ message: 'Artikel berhasil dibuat', articleId: this.lastID });
  });
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
    ORDER BY articles.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Gagal memuat artikel' });
    res.json(rows);
  });
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

app.listen(8080, () => console.log('SERVER SEHATSETARA NYALA DI PORT 8080'));
