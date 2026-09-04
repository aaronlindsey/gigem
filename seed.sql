PRAGMA foreign_keys = ON;

DELETE FROM predictions;
DELETE FROM games;
DELETE FROM players;

INSERT INTO players (id, name, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Reveille', 'player@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'Ol'' Sarge', 'sarge@example.com');

INSERT INTO games
  (id, opponent, opponent_abbreviation, venue, site, starts_at, actual_score)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Demo State', 'DSU', 'Kyle Field', 'home', unixepoch() - 1209600, 35),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Example Tech', 'ETU', 'Example Stadium', 'away', unixepoch() - 604800, 24),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Future University', 'FU', 'Kyle Field', 'home', unixepoch() + 604800, NULL);

INSERT INTO predictions (player_id, game_id, predicted_score) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 35),
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 28),
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 31),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 21);
