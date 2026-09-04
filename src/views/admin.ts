import type { Game, Player, Prediction, SyncStatus } from "../types";
import { escapeHtml, formatDate, layout, notice, utcInput } from "./common";

const notices: Record<string, string> = {
  "game-created": "Game added.",
  "game-saved": "Game updated.",
  "game-deleted": "Game and its predictions deleted.",
  "player-created": "Player added. That email can now use My Scores.",
  "player-saved": "Player updated.",
  "player-deleted": "Player and their predictions deleted.",
  "prediction-saved": "Prediction override saved.",
  "prediction-deleted": "Prediction deleted; it will score as a missing pick.",
};

function gameFields(game?: Game): string {
  return `<div class="form-grid">
    <label>Opponent
      <input name="opponent" maxlength="120" value="${escapeHtml(game?.opponent ?? "")}" required>
    </label>
    <label>Start time (UTC)
      <input name="starts_at" type="datetime-local" value="${game ? utcInput(game.starts_at) : ""}" required>
    </label>
    <label>Aggie final score
      <input name="actual_score" type="number" min="0" max="999" inputmode="numeric" value="${game?.actual_score ?? ""}" placeholder="Not final">
    </label>
    <label class="checkbox-label">
      <input name="sync_locked" type="checkbox" ${game?.sync_locked ? "checked" : ""}>
      Prevent ESPN from changing this game
    </label>
  </div>`;
}

function playerOptions(players: Player[], selected = ""): string {
  return players.map((player) =>
    `<option value="${escapeHtml(player.id)}" ${player.id === selected ? "selected" : ""}>${escapeHtml(player.name)} (${escapeHtml(player.email)})</option>`,
  ).join("");
}

function gameOptions(games: Game[], selected = ""): string {
  return games.map((game) =>
    `<option value="${escapeHtml(game.id)}" ${game.id === selected ? "selected" : ""}>${escapeHtml(game.opponent)} — ${escapeHtml(formatDate(game.starts_at))}</option>`,
  ).join("");
}

export function adminPage(
  players: Player[],
  games: Game[],
  predictions: Prediction[],
  sync: SyncStatus,
  email: string,
  status: string | null,
  syncSummary?: { seen: string; changed: string; season: string },
): string {
  const statusMarkup = status === "sync-ok" && syncSummary
    ? notice(`ESPN ${syncSummary.season} sync complete: ${syncSummary.seen} seen, ${syncSummary.changed} written.`)
    : status && notices[status]
      ? notice(notices[status])
      : "";

  const gamesMarkup = games.map((game) => `<details class="admin-card">
    <summary>
      <span><strong>vs. ${escapeHtml(game.opponent)}</strong><small>${escapeHtml(formatDate(game.starts_at))}</small></span>
      <span>${game.actual_score === null ? "Scheduled" : `Final: ${game.actual_score}`}${game.external_id ? " · ESPN" : ""}</span>
    </summary>
    <form method="post" action="/admin/games/${encodeURIComponent(game.id)}">
      ${gameFields(game)}
      ${game.external_id ? `<p class="form-help">ESPN event ${escapeHtml(game.external_id)}. Check the sync lock before making a lasting manual override.</p>` : ""}
      <button class="button" type="submit">Save game</button>
    </form>
    <form class="danger-zone" method="post" action="/admin/games/${encodeURIComponent(game.id)}/delete" data-confirm="Delete this game and every prediction for it? Standings will be recalculated.">
      <button class="button danger" type="submit">Delete game</button>
    </form>
  </details>`).join("");

  const playersMarkup = players.map((player) => `<details class="admin-card">
    <summary><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(player.email)}</span></summary>
    <form method="post" action="/admin/players/${encodeURIComponent(player.id)}">
      <div class="form-grid">
        <label>Name<input name="name" maxlength="80" value="${escapeHtml(player.name)}" required></label>
        <label>Email<input name="email" type="email" maxlength="254" value="${escapeHtml(player.email)}" required></label>
      </div>
      <button class="button" type="submit">Save player</button>
    </form>
    <form class="danger-zone" method="post" action="/admin/players/${encodeURIComponent(player.id)}/delete" data-confirm="Delete this player and all of their predictions? Historical standings may change.">
      <button class="button danger" type="submit">Delete player</button>
    </form>
  </details>`).join("");

  const playerById = new Map(players.map((player) => [player.id, player]));
  const gameById = new Map(games.map((game) => [game.id, game]));
  const predictionsMarkup = predictions.map((prediction) => {
    const player = playerById.get(prediction.player_id);
    const game = gameById.get(prediction.game_id);
    if (!player || !game) return "";
    return `<div class="admin-card prediction-admin-row">
      <div><strong>${escapeHtml(player.name)}</strong><small>vs. ${escapeHtml(game.opponent)}</small></div>
      <form method="post" action="/admin/predictions">
        <input type="hidden" name="player_id" value="${escapeHtml(player.id)}">
        <input type="hidden" name="game_id" value="${escapeHtml(game.id)}">
        <label class="sr-only" for="admin-pred-${escapeHtml(player.id)}-${escapeHtml(game.id)}">Prediction</label>
        <input id="admin-pred-${escapeHtml(player.id)}-${escapeHtml(game.id)}" name="predicted_score" type="number" min="0" max="999" value="${prediction.predicted_score}" required>
        <button class="button small" type="submit">Save</button>
      </form>
      <form method="post" action="/admin/predictions/delete" data-confirm="Delete this prediction? It will be treated as a missing pick.">
        <input type="hidden" name="player_id" value="${escapeHtml(player.id)}">
        <input type="hidden" name="game_id" value="${escapeHtml(game.id)}">
        <button class="icon-button danger-text" type="submit" aria-label="Delete ${escapeHtml(player.name)} prediction against ${escapeHtml(game.opponent)}">Delete</button>
      </form>
    </div>`;
  }).join("");

  const body = `
    <section class="hero compact">
      <p class="eyebrow">Head yell leader controls</p>
      <h1>Admin</h1>
      <p>Manage the roster, schedule, finals, and every prediction.</p>
    </section>
    ${statusMarkup}
    <nav class="admin-jumps" aria-label="Admin sections"><a href="#games">Games</a><a href="#players">Players</a><a href="#predictions">Predictions</a><a href="#sync">ESPN sync</a></nav>

    <section id="games" class="admin-section">
      <div class="section-heading"><h2>Games</h2><span>${games.length}</span></div>
      <details class="admin-card create-card"><summary><strong>+ Add a game</strong></summary>
        <form method="post" action="/admin/games">${gameFields()}<button class="button" type="submit">Add game</button></form>
      </details>
      ${gamesMarkup || '<p class="empty-inline">No games yet.</p>'}
    </section>

    <section id="players" class="admin-section">
      <div class="section-heading"><h2>Players</h2><span>${players.length}</span></div>
      <details class="admin-card create-card"><summary><strong>+ Add a player</strong></summary>
        <form method="post" action="/admin/players">
          <div class="form-grid"><label>Name<input name="name" maxlength="80" required></label><label>Email<input name="email" type="email" maxlength="254" required></label></div>
          <button class="button" type="submit">Add player</button>
        </form>
      </details>
      ${playersMarkup || '<p class="empty-inline">No players yet.</p>'}
    </section>

    <section id="predictions" class="admin-section">
      <div class="section-heading"><h2>Prediction overrides</h2><span>${predictions.length}</span></div>
      ${players.length && games.length ? `<details class="admin-card create-card"><summary><strong>+ Add or override a prediction</strong></summary>
        <form method="post" action="/admin/predictions">
          <div class="form-grid">
            <label>Player<select name="player_id" required>${playerOptions(players)}</select></label>
            <label>Game<select name="game_id" required>${gameOptions(games)}</select></label>
            <label>Prediction<input name="predicted_score" type="number" min="0" max="999" required></label>
          </div>
          <button class="button" type="submit">Save override</button>
        </form>
      </details>` : ""}
      <div class="admin-list">${predictionsMarkup || '<p class="empty-inline">No predictions yet.</p>'}</div>
    </section>

    <section id="sync" class="admin-section panel">
      <div class="section-heading"><h2>ESPN schedule sync</h2><span>${sync.last_error ? "Needs attention" : "Ready"}</span></div>
      <dl class="sync-stats">
        <div><dt>Last attempt</dt><dd>${escapeHtml(formatDate(sync.last_attempt_at))}</dd></div>
        <div><dt>Last success</dt><dd>${escapeHtml(formatDate(sync.last_success_at))}</dd></div>
        <div><dt>Last result</dt><dd>${sync.records_seen} seen / ${sync.records_changed} written</dd></div>
      </dl>
      ${sync.last_error ? notice(sync.last_error, "error") : ""}
      <p class="form-help">Upcoming start times and completed Aggie scores are imported. Sync-locked games and manually created games remain under your control.</p>
      <form method="post" action="/admin/sync"><button class="button" type="submit">Sync now</button></form>
    </section>`;

  return layout({ title: "Admin", body, authenticatedEmail: email, admin: true });
}
