-- Tables as they existed before the Worker (data copied from the "Newsletter signups" sheet).
-- Already applied in production; kept so a fresh local DB can be built.
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  list TEXT NOT NULL,
  source TEXT,
  consent TEXT,
  signed_up_at TEXT,
  confirmed_at TEXT
);
CREATE TABLE IF NOT EXISTS pending (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  token TEXT,
  source TEXT,
  consent TEXT,
  signed_up_at TEXT
);
