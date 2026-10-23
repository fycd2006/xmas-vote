-- Xmas Vote Schema Migration 0001_init.sql

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT '聖誕廚藝競賽',
  status TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','open','closed')),
  show_results INTEGER NOT NULL DEFAULT 0,
  voted_count INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0
);
INSERT INTO settings (id) VALUES (1);

CREATE TABLE dishes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
);

CREATE TABLE tokens (
  token TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unused'
    CHECK (status IN ('unused','used','void')),
  created_at INTEGER NOT NULL,
  used_at INTEGER,
  voided_at INTEGER,
  replaced_by TEXT,
  owner_dish_id TEXT,
  claim_id TEXT
);

CREATE TABLE votes (
  token TEXT PRIMARY KEY REFERENCES tokens(token),
  created_at INTEGER NOT NULL
);

CREATE TABLE vote_items (
  token TEXT NOT NULL REFERENCES votes(token),
  dish_id TEXT NOT NULL REFERENCES dishes(id),
  PRIMARY KEY (token, dish_id)
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
