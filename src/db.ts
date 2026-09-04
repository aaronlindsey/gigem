import type { Game, Player, Prediction, SyncStatus, SyncedGame } from "./types";

export async function listPlayers(db: D1Database): Promise<Player[]> {
  const result = await db
    .prepare("SELECT * FROM players ORDER BY name COLLATE NOCASE, id")
    .all<Player>();
  return result.results;
}

export async function getPlayer(db: D1Database, id: string): Promise<Player | null> {
  return db.prepare("SELECT * FROM players WHERE id = ?").bind(id).first<Player>();
}

export async function getPlayerByEmail(db: D1Database, email: string): Promise<Player | null> {
  return db.prepare("SELECT * FROM players WHERE email = ?").bind(email).first<Player>();
}

export async function createPlayer(
  db: D1Database,
  player: Pick<Player, "id" | "name" | "email">,
): Promise<void> {
  await db
    .prepare("INSERT INTO players (id, name, email) VALUES (?, ?, ?)")
    .bind(player.id, player.name, player.email)
    .run();
}

export async function updatePlayer(
  db: D1Database,
  id: string,
  name: string,
  email: string,
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE players SET name = ?, email = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(name, email, id)
    .run();
  return result.meta.changes > 0;
}

export async function deletePlayer(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM players WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}

export async function listGames(db: D1Database): Promise<Game[]> {
  const result = await db
    .prepare("SELECT * FROM games ORDER BY starts_at, id")
    .all<Game>();
  return result.results;
}

export async function getGame(db: D1Database, id: string): Promise<Game | null> {
  return db.prepare("SELECT * FROM games WHERE id = ?").bind(id).first<Game>();
}

export async function createGame(
  db: D1Database,
  game: Pick<Game, "id" | "opponent" | "starts_at" | "actual_score" | "sync_locked">,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO games (id, opponent, starts_at, actual_score, sync_locked) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(game.id, game.opponent, game.starts_at, game.actual_score, game.sync_locked)
    .run();
}

export async function updateGame(
  db: D1Database,
  id: string,
  opponent: string,
  startsAt: number,
  actualScore: number | null,
  syncLocked: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE games
       SET opponent = ?, starts_at = ?, actual_score = ?, sync_locked = ?, updated_at = unixepoch()
       WHERE id = ?`,
    )
    .bind(opponent, startsAt, actualScore, syncLocked, id)
    .run();
  return result.meta.changes > 0;
}

export async function deleteGame(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM games WHERE id = ?").bind(id).run();
  return result.meta.changes > 0;
}

export async function listPredictions(db: D1Database): Promise<Prediction[]> {
  const result = await db
    .prepare("SELECT * FROM predictions ORDER BY game_id, player_id")
    .all<Prediction>();
  return result.results;
}

export async function upsertPlayerPredictionBeforeKickoff(
  db: D1Database,
  playerId: string,
  gameId: string,
  score: number,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO predictions (player_id, game_id, predicted_score, submitted_at, updated_at)
       SELECT ?, g.id, ?, ?, ? FROM games g
       WHERE g.id = ? AND g.starts_at > ?
       ON CONFLICT(player_id, game_id) DO UPDATE SET
         predicted_score = excluded.predicted_score,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, score, now, now, gameId, now)
    .run();
  return result.meta.changes > 0;
}

export async function upsertPredictionAsAdmin(
  db: D1Database,
  playerId: string,
  gameId: string,
  score: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO predictions (player_id, game_id, predicted_score)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id, game_id) DO UPDATE SET
         predicted_score = excluded.predicted_score,
         updated_at = unixepoch()`,
    )
    .bind(playerId, gameId, score)
    .run();
}

export async function deletePrediction(
  db: D1Database,
  playerId: string,
  gameId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM predictions WHERE player_id = ? AND game_id = ?")
    .bind(playerId, gameId)
    .run();
  return result.meta.changes > 0;
}

export async function getAllGameData(db: D1Database): Promise<{
  players: Player[];
  games: Game[];
  predictions: Prediction[];
}> {
  const [players, games, predictions] = await Promise.all([
    listPlayers(db),
    listGames(db),
    listPredictions(db),
  ]);
  return { players, games, predictions };
}

export async function getSyncStatus(db: D1Database): Promise<SyncStatus> {
  const status = await db
    .prepare("SELECT * FROM sync_status WHERE provider = 'espn'")
    .first<SyncStatus>();
  return (
    status ?? {
      provider: "espn",
      last_attempt_at: null,
      last_success_at: null,
      last_error: null,
      records_seen: 0,
      records_changed: 0,
    }
  );
}

export async function recordSyncFailure(
  db: D1Database,
  attemptedAt: number,
  error: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sync_status (provider, last_attempt_at, last_error)
       VALUES ('espn', ?, ?)
       ON CONFLICT(provider) DO UPDATE SET
         last_attempt_at = excluded.last_attempt_at,
         last_error = excluded.last_error`,
    )
    .bind(attemptedAt, error.slice(0, 500))
    .run();
}

export async function recordSyncSuccess(
  db: D1Database,
  attemptedAt: number,
  recordsSeen: number,
  recordsChanged: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sync_status
         (provider, last_attempt_at, last_success_at, last_error, records_seen, records_changed)
       VALUES ('espn', ?, ?, NULL, ?, ?)
       ON CONFLICT(provider) DO UPDATE SET
         last_attempt_at = excluded.last_attempt_at,
         last_success_at = excluded.last_success_at,
         last_error = NULL,
         records_seen = excluded.records_seen,
         records_changed = excluded.records_changed`,
    )
    .bind(attemptedAt, attemptedAt, recordsSeen, recordsChanged)
    .run();
}

export async function upsertSyncedGames(
  db: D1Database,
  games: SyncedGame[],
  now: number,
): Promise<number> {
  if (games.length === 0) return 0;
  const statements = games.map((game) => db
    .prepare(
      `INSERT INTO games
         (id, opponent, starts_at, actual_score, external_source, external_id)
       VALUES (?, ?, ?, ?, 'espn', ?)
       ON CONFLICT(external_source, external_id) DO UPDATE SET
         opponent = excluded.opponent,
         starts_at = CASE
           WHEN games.starts_at > ? THEN excluded.starts_at
           ELSE games.starts_at
         END,
         actual_score = COALESCE(excluded.actual_score, games.actual_score),
         updated_at = ?
       WHERE games.sync_locked = 0 AND (
         games.opponent <> excluded.opponent OR
         (games.starts_at > ? AND games.starts_at <> excluded.starts_at) OR
         (excluded.actual_score IS NOT NULL AND games.actual_score IS NOT excluded.actual_score)
       )`,
    )
    .bind(
      crypto.randomUUID(),
      game.opponent,
      game.startsAt,
      game.actualScore,
      game.externalId,
      now,
      now,
      now,
    ));
  const results = await db.batch(statements);
  return results.reduce((changed, result) => changed + result.meta.changes, 0);
}
