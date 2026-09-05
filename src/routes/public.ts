import { optionalAuthenticatedEmail } from "../auth";
import { getAllGameData, getGame } from "../db";
import { HttpError } from "../errors";
import { htmlResponse } from "../http";
import { calculateScores, sortStandings } from "../scoring";
import type { AppEnv } from "../types";
import { gameDetailsPage, scoreboardPage } from "../views/public";

export async function showScoreboard(request: Request, env: AppEnv): Promise<Response> {
  const [{ players, games, predictions }, email] = await Promise.all([
    getAllGameData(env.DB),
    optionalAuthenticatedEmail(request, env),
  ]);
  const standings = sortStandings(calculateScores(players, games, predictions));
  const isAdmin = Boolean(
    email && env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase(),
  );
  return htmlResponse(scoreboardPage(
    standings,
    games,
    email,
    isAdmin,
    Math.floor(Date.now() / 1000),
  ));
}

export async function showGameDetails(request: Request, env: AppEnv, gameId: string): Promise<Response> {
  const [game, email] = await Promise.all([
    getGame(env.DB, gameId),
    optionalAuthenticatedEmail(request, env),
  ]);
  if (!game) throw new HttpError(404, "That game is not on the schedule.");
  const { players, games, predictions } = await getAllGameData(env.DB);
  const scores = calculateScores(players, games, predictions);
  return htmlResponse(
    gameDetailsPage(
      game,
      players,
      predictions,
      scores,
      Math.floor(Date.now() / 1000),
      email,
      Boolean(email && env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.trim().toLowerCase()),
    ),
  );
}
