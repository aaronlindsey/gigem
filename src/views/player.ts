import type { PlayerScore } from "../scoring";
import {
  compactGameDate,
  escapeHtml,
  gameLabel,
  layout,
  notice,
  scoreText,
} from "./common";

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
  rank: number,
): string {
  const statusMessage = status ? statusMessages[status] : undefined;
  const editable = (gameScore: PlayerScore["games"][number]) =>
    gameScore.game.actual_score === null &&
    (Boolean(gameScore.game.kickoff_time_tbd) || gameScore.game.starts_at > now);
  const displayedGames = [...score.games].sort((a, b) => {
    const aEditable = editable(a);
    const bEditable = editable(b);
    if (aEditable !== bEditable) return aEditable ? -1 : 1;
    if (aEditable && bEditable && Boolean(a.game.kickoff_time_tbd) !== Boolean(b.game.kickoff_time_tbd)) {
      return a.game.kickoff_time_tbd ? 1 : -1;
    }
    return aEditable ? a.game.starts_at - b.game.starts_at : b.game.starts_at - a.game.starts_at;
  });
  let foundNextPick = false;
  const rows = displayedGames.map((gameScore) => {
    const isEditable = editable(gameScore);
    const featured = isEditable && !foundNextPick;
    if (featured) foundNextPick = true;

    const prediction = isEditable
      ? `<form class="prediction-form" method="post" action="/scores/predictions/${encodeURIComponent(gameScore.game.id)}">
          <div class="score-stepper">
            <button type="button" data-step="-1" aria-label="Decrease prediction">−</button>
            <label class="sr-only" for="prediction-${escapeHtml(gameScore.game.id)}">Aggie score against ${escapeHtml(gameScore.game.opponent)}</label>
            <input id="prediction-${escapeHtml(gameScore.game.id)}" name="predicted_score" type="number" min="3" max="99" inputmode="numeric" value="${gameScore.prediction ?? ""}" placeholder="—" required aria-describedby="prediction-help">
            <button type="button" data-step="1" aria-label="Increase prediction">+</button>
          </div>
          <button class="button save-pick" type="submit">Save pick</button>
        </form>`
      : "";

    let chip = "";
    if (gameScore.bonus) chip = '<span class="chip bonus-chip">Whoop! −5 bonus</span>';
    if (gameScore.dropped) chip = '<span class="chip dropped-chip">Dropped</span>';

    const lockedPrediction = gameScore.prediction === null
      ? '<span class="muted">0 <small>no pick</small></span>'
      : `<b>${gameScore.prediction}</b>`;
    const computed = gameScore.creditedScore === null
      ? '<span class="muted">—</span>'
      : gameScore.dropped
        ? `<b><s>${scoreText(gameScore.creditedScore)}</s></b>`
        : `<b>${scoreText(gameScore.creditedScore)}</b>`;

    return `<article class="pick-card${isEditable ? " open" : ""}${featured ? " featured-pick" : ""}${gameScore.dropped ? " dropped" : ""}" data-testid="score-game-${escapeHtml(gameScore.game.id)}">
      <div class="pick-head">
        <div>
          <span class="pick-status" ${featured && !gameScore.game.kickoff_time_tbd ? `data-countdown data-closes-at="${gameScore.game.starts_at}"` : ""}>${isEditable ? (gameScore.game.kickoff_time_tbd ? "Open · kickoff TBD" : featured ? "Next pick closes soon" : "Open") : gameScore.game.actual_score === null ? "Locked" : "Final"}</span>
          <h2><a href="/games/${encodeURIComponent(gameScore.game.id)}">${escapeHtml(gameLabel(gameScore.game))}</a></h2>
          <p>${compactGameDate(gameScore.game)}${gameScore.game.venue ? ` <i aria-hidden="true">·</i> ${escapeHtml(gameScore.game.venue)}` : ""}</p>
        </div>
        ${chip}
      </div>
      ${isEditable ? prediction : `<div class="pick-stats">
        <div><span>Your pick</span>${lockedPrediction}</div>
        <div><span>Aggies</span><b>${gameScore.game.actual_score ?? "—"}</b></div>
        <div><span>Points</span><span data-testid="credited-${escapeHtml(gameScore.game.id)}">${computed}</span></div>
      </div>`}
    </article>`;
  }).join("");

  const body = `
    <h1 class="howdy-title">Howdy, ${escapeHtml(score.player.name)}!</h1>
    <section class="total-card">
      <div><span>Running total · ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} place</span><strong>Season points</strong></div>
      <b data-testid="player-total">${score.total}</b>
    </section>
    ${statusMessage ? notice(statusMessage.text, statusMessage.kind) : ""}
    <p id="prediction-help" class="sr-only">Predict from 3 to 99 Aggie points. Picks lock exactly at kickoff.</p>
    <section class="score-sheet" aria-label="Game predictions and scores">
      ${rows || '<p class="inline-note">No games yet. Check back after the schedule is posted.</p>'}
    </section>
    <details class="rules-card">
      <summary>How does scoring work?</summary>
      <div><p>Each game is the absolute difference between your prediction and the Aggies' final score. An exact pick earns −5.</p><p>After at least two games are final, we compare your error with the best player's error in each game. The game where you finished farthest behind that game's best player is dropped from your total.</p></div>
    </details>`;

  return layout({
    title: "My picks",
    body,
    authenticatedEmail: email,
    admin: isAdmin,
    active: "picks",
  });
}
