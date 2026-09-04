import type { Game, Player, Prediction } from "../types";
import type { PlayerScore } from "../scoring";
import {
  compactGameDate,
  emptyState,
  escapeHtml,
  gameLabel,
  layout,
  localGameDate,
  opponentMark,
  scoreText,
} from "./common";

function gamePlace(game: Game): string {
  return escapeHtml(game.venue ?? "Location TBD");
}

function gameStatus(game: Game, now: number): string {
  if (game.actual_score !== null) return "Final";
  if (!game.kickoff_time_tbd && game.starts_at <= now) return "Underway";
  return "Upcoming";
}

export function scoreboardPage(
  standings: PlayerScore[],
  games: Game[],
  authenticatedEmail: string | null,
  isAdmin: boolean,
  now: number,
): string {
  const nextPick = games.find((game) =>
    game.actual_score === null && !game.kickoff_time_tbd && game.starts_at > now
  ) ?? games.find((game) => game.actual_score === null && Boolean(game.kickoff_time_tbd));

  const nextMarkup = nextPick
    ? `<a class="next-game" href="/games/${encodeURIComponent(nextPick.id)}">
        <span class="next-label" ${nextPick.kickoff_time_tbd ? "" : `data-countdown data-closes-at="${nextPick.starts_at}"`}>${nextPick.kickoff_time_tbd ? "Next pick · time TBD" : "Next pick closes soon"}</span>
        <span class="teams">
          <span class="team"><b>A&amp;M</b><strong>Aggies</strong></span>
          <span class="versus">${nextPick.site === "away" ? "@" : "VS"}</span>
          <span class="team opponent"><b>${escapeHtml(opponentMark(nextPick))}</b><strong>${escapeHtml(nextPick.opponent)}</strong></span>
        </span>
        <span class="match-meta">${compactGameDate(nextPick)} <i aria-hidden="true">·</i> ${gamePlace(nextPick)}</span>
      </a>`
    : `<section class="next-game next-game-empty">
        <span class="next-label">Season status</span>
        <strong>${games.length ? "All picks are locked" : "Schedule coming soon"}</strong>
        <span>${games.length ? "Check the leaderboard for the latest standings." : "The first matchup will appear here once it is added."}</span>
      </section>`;

  const standingsMarkup = standings.length === 0
    ? emptyState("The stands are quiet", "No players have joined the roster yet.")
    : `<ol class="standings" data-testid="standings">
        ${standings.map((standing, index) => `
          <li class="standing ${index < 2 ? "podium-card" : "standing-row"}" data-player="${escapeHtml(standing.player.name)}">
            <span class="position">#${index + 1}</span>
            <strong class="standing-name">${escapeHtml(standing.player.name)}</strong>
            <b class="standing-score" data-testid="total-${escapeHtml(standing.player.id)}">${standing.total}</b>
          </li>`).join("")}
       </ol>`;

  const scheduleMarkup = games.length === 0
    ? ""
    : `<section class="schedule-section">
        <div class="section-heading"><h2>Season games</h2><span>${games.length}</span></div>
        <div class="schedule-list">
          ${games.map((game) => `<a class="schedule-row" href="/games/${encodeURIComponent(game.id)}">
            <span><small>${gameStatus(game, now)}</small><strong>${escapeHtml(gameLabel(game))}</strong></span>
            <span class="schedule-meta">${compactGameDate(game)}${game.actual_score === null ? "" : `<b>A&amp;M ${game.actual_score}</b>`}</span>
            <svg viewBox="0 0 12 20" aria-hidden="true"><path d="m2 2 8 8-8 8"/></svg>
          </a>`).join("")}
        </div>
      </section>`;

  return layout({
    title: "Leaderboard",
    authenticatedEmail: authenticatedEmail ?? undefined,
    admin: isAdmin,
    active: "board",
    body: `
      ${nextMarkup}
      <section class="leaderboard-section">
        <div class="section-heading"><h1>Leaderboard</h1></div>
        ${games.some((game) => game.actual_score !== null) ? "" : '<p class="inline-note">Everyone is tied at zero until the first final.</p>'}
        ${standingsMarkup}
      </section>
      ${scheduleMarkup}`,
  });
}

export function gameDetailsPage(
  game: Game,
  players: Player[],
  predictions: Prediction[],
  scores: PlayerScore[],
  now: number,
  authenticatedEmail: string | null,
  isAdmin: boolean,
): string {
  const started = game.actual_score !== null ||
    (!game.kickoff_time_tbd && game.starts_at <= now);
  const predictionMap = new Map(
    predictions.filter((prediction) => prediction.game_id === game.id)
      .map((prediction) => [prediction.player_id, prediction.predicted_score]),
  );

  let details: string;
  if (!started) {
    details = emptyState(
      "Picks are under wraps",
      "Predictions are revealed at kickoff.",
    );
  } else if (players.length === 0) {
    details = emptyState("No picks yet", "There are no players on the roster.");
  } else {
    const displayPlayers = game.actual_score === null
      ? players
      : [...players].sort((a, b) => {
          const aScore = scores.find((score) => score.player.id === a.id)?.games.find((item) => item.game.id === game.id)?.creditedScore ?? 0;
          const bScore = scores.find((score) => score.player.id === b.id)?.games.find((item) => item.game.id === game.id)?.creditedScore ?? 0;
          return aScore - bScore || a.name.localeCompare(b.name);
        });
    const rows = displayPlayers.map((player) => {
      const prediction = predictionMap.get(player.id);
      const playerScore = scores.find((score) => score.player.id === player.id);
      const gameScore = playerScore?.games.find((score) => score.game.id === game.id);
      const scoreMarkup = game.actual_score === null || !gameScore
        ? '<span class="muted">Pending</span>'
        : gameScore.bonus
          ? `<strong class="bonus">Whoop! ${scoreText(gameScore.creditedScore ?? -5)}</strong>`
          : `<span>${scoreText(gameScore.creditedScore ?? 0)}</span>`;
      return `<tr>
        <th scope="row">${escapeHtml(player.name)}</th>
        <td>${prediction ?? `<span class="muted">0 (no pick)</span>`}</td>
        <td>${scoreMarkup}</td>
      </tr>`;
    }).join("");
    details = `<div class="table-scroll"><table>
      <thead><tr><th>Player</th><th>Prediction</th><th>Points</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  return layout({
    title: gameLabel(game),
    authenticatedEmail: authenticatedEmail ?? undefined,
    admin: isAdmin,
    active: "board",
    body: `
      <a class="back-link" href="/">← Leaderboard</a>
      <section class="game-hero">
        <span class="next-label">${gameStatus(game, now)}</span>
        <div class="teams">
          <span class="team"><b>A&amp;M</b><strong>Aggies</strong></span>
          <span class="versus">${game.site === "away" ? "@" : "VS"}</span>
          <span class="team opponent"><b>${escapeHtml(opponentMark(game))}</b><strong>${escapeHtml(game.opponent)}</strong></span>
        </div>
        <p class="match-meta">${compactGameDate(game)} <i aria-hidden="true">·</i> ${gamePlace(game)}</p>
        ${game.actual_score === null ? "" : `<div class="final-result"><span>Final score</span><strong>Texas A&amp;M ${game.actual_score}</strong></div>`}
      </section>
      <section class="game-picks panel">
        <div class="section-heading"><h1>Game picks</h1><span>${started ? "Locked" : "At kickoff"}</span></div>
        ${details}
      </section>`,
  });
}
