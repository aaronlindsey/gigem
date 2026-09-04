import type { Game, Player, Prediction } from "../types";
import type { PlayerScore } from "../scoring";
import { emptyState, escapeHtml, formatGameDate, layout, scoreText } from "./common";

export function scoreboardPage(standings: PlayerScore[], games: Game[]): string {
  const standingsMarkup = standings.length === 0
    ? emptyState("The stands are quiet", "No players have joined the roster yet.")
    : `<ol class="standings" data-testid="standings">
        ${standings.map((standing, index) => `
          <li class="standing-card" data-player="${escapeHtml(standing.player.name)}">
            <span class="rank" aria-label="Rank ${index + 1}">${index + 1}</span>
            <span class="standing-name">${escapeHtml(standing.player.name)}</span>
            <strong class="standing-score" data-testid="total-${escapeHtml(standing.player.id)}">${standing.total}</strong>
          </li>`).join("")}
       </ol>`;

  const gamesMarkup = games.length === 0
    ? emptyState("No games on the board", "The administrator will add the schedule soon.")
    : `<div class="game-grid">
        ${games.map((game) => `
          <a class="game-card" href="/games/${encodeURIComponent(game.id)}">
            <span class="eyebrow">${game.actual_score === null ? (!game.kickoff_time_tbd && game.starts_at * 1000 <= Date.now() ? "Underway" : "Upcoming") : "Final"}</span>
            <strong>vs. ${escapeHtml(game.opponent)}</strong>
            <span>${escapeHtml(formatGameDate(game))}</span>
            ${game.actual_score === null ? "" : `<span class="actual-pill">Aggies ${game.actual_score}</span>`}
          </a>`).join("")}
       </div>`;

  return layout({
    title: "Scoreboard",
    body: `
      <section class="hero">
        <p class="eyebrow">Fightin' Texas Aggie Football</p>
        <h1>Scoreboard</h1>
        <p>Closest guesses win. Like golf, lower is better.</p>
      </section>
      <section class="panel">
        <div class="section-heading"><h2>12th Man standings</h2><span>Worst relative game dropped</span></div>
        ${games.some((game) => game.actual_score !== null) ? "" : '<p class="empty-inline">No final scores yet. Everyone is tied at zero until the first final.</p>'}
        ${standingsMarkup}
      </section>
      <section class="section-block">
        <div class="section-heading"><h2>Game board</h2><span>${games.length} game${games.length === 1 ? "" : "s"}</span></div>
        ${gamesMarkup}
      </section>`,
  });
}

export function gameDetailsPage(
  game: Game,
  players: Player[],
  predictions: Prediction[],
  scores: PlayerScore[],
  now: number,
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
      "Predictions are revealed at kickoff. No peeking, two-percenters.",
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
          ? `<strong class="bonus">Whoop! ${scoreText(gameScore.creditedScore ?? -5)} bonus</strong>`
          : `<span>${scoreText(gameScore.creditedScore ?? 0)}</span>`;
      return `<tr>
        <th scope="row">${escapeHtml(player.name)}</th>
        <td>${prediction ?? `<span class="muted">0 (no pick)</span>`}</td>
        <td>${scoreMarkup}</td>
      </tr>`;
    }).join("");
    details = `<div class="table-scroll"><table>
      <thead><tr><th>Player</th><th>Prediction</th><th>Game score</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  return layout({
    title: `vs. ${game.opponent}`,
    body: `
      <a class="back-link" href="/">← Back to scoreboard</a>
      <section class="hero compact">
        <p class="eyebrow">${game.actual_score === null ? (started ? "Game in progress" : "Upcoming game") : "Final"}</p>
        <h1>Texas A&amp;M vs. ${escapeHtml(game.opponent)}</h1>
        <p>${escapeHtml(formatGameDate(game))}</p>
        ${game.actual_score === null ? "" : `<div class="final-score"><span>Aggies</span><strong>${game.actual_score}</strong></div>`}
      </section>
      <section class="panel">
        <div class="section-heading"><h2>Game picks</h2>${started ? "<span>Picks locked</span>" : "<span>Revealed at kickoff</span>"}</div>
        ${details}
      </section>`,
  });
}
