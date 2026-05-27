BEGIN;

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
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_path TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  data BYTEA NOT NULL,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (setting_key, setting_value)
VALUES (
  'daily_health_tip',
  '{"title":"Tidur 7–8 Jam Per Malam","desc":"Tidur cukup meningkatkan imunitas dan membantu tubuh memperbaiki sel-sel yang rusak."}'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

UPDATE users
SET role = 'dokter'
WHERE role = 'produsen';

UPDATE users
SET role = 'pengguna',
    requested_role = 'dokter'
WHERE role = 'dokter'
  AND is_approved = FALSE
  AND COALESCE(requested_role, '') = '';

UPDATE users
SET requested_role = ''
WHERE role <> 'pengguna'
  AND COALESCE(requested_role, '') = '';

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM users), false));
SELECT setval(pg_get_serial_sequence('articles', 'id'), COALESCE((SELECT MAX(id) FROM articles), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM articles), false));
SELECT setval(pg_get_serial_sequence('audit_logs', 'id'), COALESCE((SELECT MAX(id) FROM audit_logs), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM audit_logs), false));
SELECT setval(pg_get_serial_sequence('media_assets', 'id'), COALESCE((SELECT MAX(id) FROM media_assets), 1), COALESCE((SELECT MAX(id) IS NOT NULL FROM media_assets), false));

COMMIT;