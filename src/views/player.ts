import type { PlayerScore } from "../scoring";
import { escapeHtml, layout, localGameDate, notice, scoreText } from "./common";

const statusMessages: Record<string, { text: string; kind: "success" | "error" }> = {
  saved: { text: "Prediction saved. Good bull!", kind: "success" },
  locked: { text: "That game has already started, so its prediction is locked.", kind: "error" },
  invalid: {
    text: "Choose a number from 3 to 99. Less than 3 means you're a two-percenter.",
    kind: "error",
  },
};

export function playerScoresPage(
  score: PlayerScore,
  email: string,
  now: number,
  status: string | null,
  isAdmin: boolean,
): string {
  const statusMessage = status ? statusMessages[status] : undefined;
  const rows = score.games.map((gameScore) => {
    const editable = gameScore.game.actual_score === null &&
      (Boolean(gameScore.game.kickoff_time_tbd) || gameScore.game.starts_at > now);
    const droppedClass = gameScore.dropped ? " dropped-row" : "";
    const prediction = editable
      ? `<form class="prediction-form" method="post" action="/scores/predictions/${encodeURIComponent(gameScore.game.id)}">
          <label class="sr-only" for="prediction-${escapeHtml(gameScore.game.id)}">Aggie score against ${escapeHtml(gameScore.game.opponent)}</label>
          <input id="prediction-${escapeHtml(gameScore.game.id)}" name="predicted_score" type="number" min="3" max="99" inputmode="numeric" value="${gameScore.prediction ?? ""}" required aria-describedby="prediction-help">
          <button class="button small" type="submit">Save</button>
        </form>`
      : gameScore.prediction === null
        ? '<span class="muted">0 (no pick)</span>'
        : `<strong>${gameScore.prediction}</strong>`;

    let computed = '<span class="muted">—</span>';
    if (gameScore.creditedScore !== null) {
      const value = scoreText(gameScore.creditedScore);
      computed = gameScore.dropped
        ? `<s>${value}</s> <span class="tag dropped-tag">Dropped</span>`
        : `<strong>${value}</strong>`;
      if (gameScore.bonus) computed += ' <span class="tag bonus-tag">Whoop! −5 bonus</span>';
    }

    return `<article class="score-sheet-row${droppedClass}" data-testid="score-game-${escapeHtml(gameScore.game.id)}">
      <div class="game-cell">
        <span class="eyebrow">${editable ? "Open" : "Locked"}</span>
        <h3><a href="/games/${encodeURIComponent(gameScore.game.id)}">vs. ${escapeHtml(gameScore.game.opponent)}</a></h3>
        <span>${localGameDate(gameScore.game)}</span>
      </div>
      <div class="score-cell"><span class="cell-label">Your prediction</span>${prediction}</div>
      <div class="score-cell"><span class="cell-label">Actual</span><strong>${gameScore.game.actual_score ?? "—"}</strong></div>
      <div class="score-cell"><span class="cell-label">Your score</span><span data-testid="credited-${escapeHtml(gameScore.game.id)}">${computed}</span></div>
    </article>`;
  }).join("");

  const body = `
    <section class="hero score-hero">
      <p class="eyebrow">Howdy, ${escapeHtml(score.player.name)}!</p>
      <h1>My scores</h1>
      <div class="total-lockup"><span>Season total</span><strong data-testid="player-total">${score.total}</strong></div>
    </section>
    ${statusMessage ? notice(statusMessage.text, statusMessage.kind) : ""}
    <p id="prediction-help" class="form-help">Predict how many points the Aggies will score. Picks lock exactly at kickoff.</p>
    <section class="score-sheet" aria-label="Game predictions and scores">
      ${rows || '<p class="empty-inline">No games yet. Check back after the schedule is posted.</p>'}
    </section>
    <aside class="rules-card">
      <h2>How your total works</h2>
      <p>Each game is the absolute difference between your prediction and the Aggies' actual score. An exact pick earns −5.</p>
      <p>After two finals, we drop the game where you finished farthest from that game's best player. The crossed-out score above is not counted.</p>
    </aside>`;

  return layout({
    title: "My scores",
    body,
    authenticatedEmail: email,
    admin: isAdmin,
  });
}
