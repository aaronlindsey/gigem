PRAGMA foreign_keys = ON;

DELETE FROM predictions;
DELETE FROM games;
DELETE FROM players;
UPDATE sync_status SET last_attempt_at = NULL, last_success_at = NULL, last_error = NULL, records_seen = 0, records_changed = 0 WHERE provider = 'espn';

INSERT INTO players (id, name, email) VALUES
  ('alice', 'Alice', 'alice@example.com'),
  ('bob', 'Bob', 'bob@example.com'),
  ('carol', 'Carol', 'carol@example.com');

INSERT INTO games (id, opponent, starts_at, actual_score) VALUES
  ('game-1', 'Far Off State', unixepoch() - 400000, 40),
  ('game-2', 'Best Pick Tech', unixepoch() - 300000, 30),
  ('game-3', 'Bonus University', unixepoch() - 200000, 21),
  ('game-started', 'Locked College', unixepoch() - 1000, NULL),
  ('game-tbd', 'TBD State', unixepoch() - 1000, NULL),
  ('game-future', 'Future State', unixepoch() + 400000, NULL);

UPDATE games SET kickoff_time_tbd = 1 WHERE id = 'game-tbd';

INSERT INTO predictions (player_id, game_id, predicted_score) VALUES
  ('alice', 'game-1', 10),
  ('bob', 'game-1', 11),
  ('alice', 'game-2', 10),
  ('bob', 'game-2', 30),
  ('carol', 'game-2', 20),
  ('alice', 'game-3', 21),
  ('bob', 'game-3', 20),
  ('carol', 'game-3', 31),
  ('alice', 'game-started', 22),
  ('alice', 'game-future', 33);
