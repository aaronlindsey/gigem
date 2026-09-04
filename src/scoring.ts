import type { Game, Player, Prediction } from "./types";

export const EXACT_PREDICTION_BONUS = -5;
export const MISSING_PREDICTION = 0;

export interface PlayerGameScore {
  game: Game;
  prediction: number | null;
  scoringPrediction: number;
  rawError: number | null;
  creditedScore: number | null;
  bestRawError: number | null;
  distanceFromBest: number | null;
  bonus: boolean;
  dropped: boolean;
}

export interface PlayerScore {
  player: Player;
  games: PlayerGameScore[];
  total: number;
  droppedGameId: string | null;
}

function predictionKey(playerId: string, gameId: string): string {
  return `${playerId}:${gameId}`;
}

export function calculateScores(
  players: Player[],
  games: Game[],
  predictions: Prediction[],
): PlayerScore[] {
  const predictionByPlayerGame = new Map(
    predictions.map((prediction) => [
      predictionKey(prediction.player_id, prediction.game_id),
      prediction.predicted_score,
    ]),
  );

  const bestRawErrorByGame = new Map<string, number>();
  for (const game of games) {
    if (game.actual_score === null || players.length === 0) continue;
    let best = Number.POSITIVE_INFINITY;
    for (const player of players) {
      const prediction =
        predictionByPlayerGame.get(predictionKey(player.id, game.id)) ?? MISSING_PREDICTION;
      best = Math.min(best, Math.abs(prediction - game.actual_score));
    }
    bestRawErrorByGame.set(game.id, best);
  }

  return players.map((player) => {
    const playerGames: PlayerGameScore[] = games.map((game) => {
      const storedPrediction = predictionByPlayerGame.get(predictionKey(player.id, game.id));
      const scoringPrediction = storedPrediction ?? MISSING_PREDICTION;
      if (game.actual_score === null) {
        return {
          game,
          prediction: storedPrediction ?? null,
          scoringPrediction,
          rawError: null,
          creditedScore: null,
          bestRawError: null,
          distanceFromBest: null,
          bonus: false,
          dropped: false,
        };
      }

      const rawError = Math.abs(scoringPrediction - game.actual_score);
      const bonus = storedPrediction !== undefined && rawError === 0;
      const bestRawError = bestRawErrorByGame.get(game.id) ?? rawError;
      return {
        game,
        prediction: storedPrediction ?? null,
        scoringPrediction,
        rawError,
        creditedScore: bonus ? EXACT_PREDICTION_BONUS : rawError,
        bestRawError,
        distanceFromBest: rawError - bestRawError,
        bonus,
        dropped: false,
      };
    });

    const completed = playerGames.filter(
      (gameScore): gameScore is PlayerGameScore & {
        creditedScore: number;
        distanceFromBest: number;
      } => gameScore.creditedScore !== null && gameScore.distanceFromBest !== null,
    );

    let dropped: (typeof completed)[number] | undefined;
    if (completed.length >= 2) {
      dropped = [...completed].sort((a, b) => {
        if (a.distanceFromBest !== b.distanceFromBest) {
          return b.distanceFromBest - a.distanceFromBest;
        }
        if (a.creditedScore !== b.creditedScore) {
          return b.creditedScore - a.creditedScore;
        }
        if (a.game.starts_at !== b.game.starts_at) {
          return a.game.starts_at - b.game.starts_at;
        }
        return a.game.id.localeCompare(b.game.id);
      })[0];
      dropped.dropped = true;
    }

    const total = completed.reduce((sum, gameScore) => sum + gameScore.creditedScore, 0) -
      (dropped?.creditedScore ?? 0);

    return {
      player,
      games: playerGames,
      total,
      droppedGameId: dropped?.game.id ?? null,
    };
  });
}

export function sortStandings(scores: PlayerScore[]): PlayerScore[] {
  return [...scores].sort(
    (a, b) => a.total - b.total || a.player.name.localeCompare(b.player.name),
  );
}
