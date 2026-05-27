const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    is_approved INTEGER DEFAULT 0,
    full_name TEXT,
    age TEXT,
    province TEXT,
    city TEXT,
    district TEXT,
    hospital_name TEXT,
    latitude REAL,
    longitude REAL
  )`);

  // Ensure profile columns exist for existing tables
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) return;
    const columnNames = columns.map(c => c.name);
    const columnsToEnsure = [
      ["full_name", "TEXT"],
      ["age", "TEXT"],
      ["province", "TEXT"],
      ["city", "TEXT"],
      ["district", "TEXT"],
      ["hospital_name", "TEXT"],
      ["latitude", "REAL"],
      ["longitude", "REAL"],
    ];

    columnsToEnsure.forEach(([name, type]) => {
      if (!columnNames.includes(name)) {
        db.run(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
      }
    });
  });

  // Create articles table
  db.run(`CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    media_path TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    author_id INTEGER,
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`);

  db.all("PRAGMA table_info(articles)", (err, columns) => {
    if (err) return;
    const columnNames = columns.map((c) => c.name);
    if (!columnNames.includes("created_at")) {
      db.run("ALTER TABLE articles ADD COLUMN created_at TEXT");
    }
  });
});

module.exports = db;
