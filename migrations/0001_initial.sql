PRAGMA foreign_keys = ON;

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (email = lower(trim(email)) AND length(email) <= 254),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX players_email_unique ON players(email);
CREATE INDEX players_name_index ON players(name COLLATE NOCASE);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  opponent TEXT NOT NULL CHECK (length(trim(opponent)) BETWEEN 1 AND 120),
  starts_at INTEGER NOT NULL,
  actual_score INTEGER CHECK (actual_score IS NULL OR actual_score >= 0),
  external_source TEXT,
  external_id TEXT,
  sync_locked INTEGER NOT NULL DEFAULT 0 CHECK (sync_locked IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (external_source, external_id)
);

CREATE INDEX games_starts_at_index ON games(starts_at);

CREATE TABLE predictions (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  predicted_score INTEGER NOT NULL CHECK (predicted_score >= 0),
  submitted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (player_id, game_id)
);

CREATE INDEX predictions_game_index ON predictions(game_id);

CREATE TABLE sync_status (
  provider TEXT PRIMARY KEY,
  last_attempt_at INTEGER,
  last_success_at INTEGER,
  last_error TEXT,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_changed INTEGER NOT NULL DEFAULT 0
);

INSERT INTO sync_status(provider) VALUES ('espn');
