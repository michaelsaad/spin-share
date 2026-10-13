-- Profiles and sessions as JSON documents, keyed "profiles/<id>" / "sessions/<id>".
CREATE TABLE IF NOT EXISTS docs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER
);
