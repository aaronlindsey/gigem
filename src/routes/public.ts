import { getAllGameData, getGame } from "../db";
import { HttpError } from "../errors";
import { htmlResponse } from "../http";
import { calculateScores, sortStandings } from "../scoring";
import type { AppEnv } from "../types";
import { gameDetailsPage, scoreboardPage } from "../views/public";

export async function showScoreboard(env: AppEnv): Promise<Response> {
  const { players, games, predictions } = await getAllGameData(env.DB);
  const standings = sortStandings(calculateScores(players, games, predictions));
  return htmlResponse(scoreboardPage(standings, games));
}

export async function showGameDetails(env: AppEnv, gameId: string): Promise<Response> {
  const game = await getGame(env.DB, gameId);
  if (!game) throw new HttpError(404, "That game is not on the schedule.");
  const { players, games, predictions } = await getAllGameData(env.DB);
  const scores = calculateScores(players, games, predictions);
  return htmlResponse(
    gameDetailsPage(game, players, predictions, scores, Math.floor(Date.now() / 1000)),
  );
}
