import { requirePlayer } from "../auth";
import { getAllGameData, upsertPlayerPredictionBeforeKickoff } from "../db";
import { ValidationError } from "../errors";
import { htmlResponse, redirect } from "../http";
import { calculateScores, sortStandings } from "../scoring";
import type { AppEnv } from "../types";
import { assertSameOrigin, playerPrediction } from "../validation";
import { playerScoresPage } from "../views/player";

export async function showPlayerScores(request: Request, env: AppEnv): Promise<Response> {
  const player = await requirePlayer(request, env);
  const { players, games, predictions } = await getAllGameData(env.DB);
  const scores = calculateScores(players, games, predictions);
  const score = scores.find((candidate) => candidate.player.id === player.id);
  if (!score) throw new Error("Authenticated player disappeared from the roster.");
  const rank = sortStandings(scores).findIndex((candidate) => candidate.player.id === player.id) + 1;
  const url = new URL(request.url);
  const isAdmin = Boolean(env.ADMIN_EMAIL && player.email === env.ADMIN_EMAIL.trim().toLowerCase());
  return htmlResponse(
    playerScoresPage(
      score,
      player.email,
      Math.floor(Date.now() / 1000),
      url.searchParams.get("status"),
      isAdmin,
      rank,
    ),
  );
}

export async function savePlayerPrediction(
  request: Request,
  env: AppEnv,
  gameId: string,
): Promise<Response> {
  const player = await requirePlayer(request, env);
  assertSameOrigin(request);
  const form = await request.formData();
  let score: number;
  try {
    score = playerPrediction(form);
  } catch (error) {
    if (error instanceof ValidationError) return redirect("/scores?status=invalid");
    throw error;
  }
  const now = Math.floor(Date.now() / 1000);
  const saved = await upsertPlayerPredictionBeforeKickoff(env.DB, player.id, gameId, score, now);
  return redirect(`/scores?status=${saved ? "saved" : "locked"}`);
}
