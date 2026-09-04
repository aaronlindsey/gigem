import { requireAdmin } from "../auth";
import {
  createGame,
  createPlayer,
  deleteGame,
  deletePlayer,
  deletePrediction,
  getAllGameData,
  getGame,
  getPlayer,
  getSyncStatus,
  updateGame,
  updatePlayer,
  upsertPredictionAsAdmin,
} from "../db";
import { HttpError, ValidationError } from "../errors";
import { syncEspnGames } from "../espn";
import { htmlResponse, redirect } from "../http";
import type { AppEnv } from "../types";
import {
  assertSameOrigin,
  checked,
  nonnegativeInteger,
  requiredText,
  utcTimestamp,
  validEmail,
} from "../validation";
import { adminPage } from "../views/admin";

async function adminForm(request: Request, env: AppEnv): Promise<{ email: string; form: FormData }> {
  const email = await requireAdmin(request, env);
  assertSameOrigin(request);
  return { email, form: await request.formData() };
}

function dbValidation(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("players.email") || message.includes("UNIQUE constraint")) {
    throw new ValidationError("That email or external game is already in use.");
  }
  if (message.includes("FOREIGN KEY")) {
    throw new ValidationError("The selected player or game no longer exists.");
  }
  throw error;
}

export async function showAdmin(request: Request, env: AppEnv): Promise<Response> {
  const email = await requireAdmin(request, env);
  const [{ players, games, predictions }, sync] = await Promise.all([
    getAllGameData(env.DB),
    getSyncStatus(env.DB),
  ]);
  const url = new URL(request.url);
  return htmlResponse(adminPage(
    players,
    games,
    predictions,
    sync,
    email,
    url.searchParams.get("status"),
    url.searchParams.get("status") === "sync-ok"
      ? {
          seen: url.searchParams.get("seen") ?? "0",
          changed: url.searchParams.get("changed") ?? "0",
          season: url.searchParams.get("season") ?? "",
        }
      : undefined,
  ));
}

export async function addGame(request: Request, env: AppEnv): Promise<Response> {
  const { form } = await adminForm(request, env);
  try {
    await createGame(env.DB, {
      id: crypto.randomUUID(),
      opponent: requiredText(form, "opponent", 120),
      starts_at: utcTimestamp(form),
      kickoff_time_tbd: checked(form, "kickoff_time_tbd"),
      actual_score: nonnegativeInteger(form, "actual_score", { nullable: true, max: 999 }),
      sync_locked: checked(form, "sync_locked"),
    });
  } catch (error) {
    dbValidation(error);
  }
  return redirect("/admin?status=game-created#games");
}

export async function editGame(
  request: Request,
  env: AppEnv,
  gameId: string,
): Promise<Response> {
  const { form } = await adminForm(request, env);
  const changed = await updateGame(
    env.DB,
    gameId,
    requiredText(form, "opponent", 120),
    utcTimestamp(form),
    checked(form, "kickoff_time_tbd"),
    nonnegativeInteger(form, "actual_score", { nullable: true, max: 999 }),
    checked(form, "sync_locked"),
  );
  if (!changed) throw new HttpError(404, "That game no longer exists.");
  return redirect("/admin?status=game-saved#games");
}

export async function removeGame(
  request: Request,
  env: AppEnv,
  gameId: string,
): Promise<Response> {
  await adminForm(request, env);
  if (!(await deleteGame(env.DB, gameId))) throw new HttpError(404, "That game no longer exists.");
  return redirect("/admin?status=game-deleted#games");
}

export async function addPlayer(request: Request, env: AppEnv): Promise<Response> {
  const { form } = await adminForm(request, env);
  try {
    await createPlayer(env.DB, {
      id: crypto.randomUUID(),
      name: requiredText(form, "name", 80),
      email: validEmail(form),
    });
  } catch (error) {
    dbValidation(error);
  }
  return redirect("/admin?status=player-created#players");
}

export async function editPlayer(
  request: Request,
  env: AppEnv,
  playerId: string,
): Promise<Response> {
  const { form } = await adminForm(request, env);
  try {
    const changed = await updatePlayer(
      env.DB,
      playerId,
      requiredText(form, "name", 80),
      validEmail(form),
    );
    if (!changed) throw new HttpError(404, "That player no longer exists.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    dbValidation(error);
  }
  return redirect("/admin?status=player-saved#players");
}

export async function removePlayer(
  request: Request,
  env: AppEnv,
  playerId: string,
): Promise<Response> {
  await adminForm(request, env);
  if (!(await deletePlayer(env.DB, playerId))) throw new HttpError(404, "That player no longer exists.");
  return redirect("/admin?status=player-deleted#players");
}

export async function saveAdminPrediction(request: Request, env: AppEnv): Promise<Response> {
  const { form } = await adminForm(request, env);
  const playerId = requiredText(form, "player_id", 64);
  const gameId = requiredText(form, "game_id", 64);
  const score = nonnegativeInteger(form, "predicted_score", { max: 999 });
  if (score === null) throw new ValidationError("Prediction is required.");
  const [player, game] = await Promise.all([getPlayer(env.DB, playerId), getGame(env.DB, gameId)]);
  if (!player || !game) throw new ValidationError("Select an existing player and game.");
  try {
    await upsertPredictionAsAdmin(env.DB, playerId, gameId, score);
  } catch (error) {
    dbValidation(error);
  }
  return redirect("/admin?status=prediction-saved#predictions");
}

export async function removePrediction(request: Request, env: AppEnv): Promise<Response> {
  const { form } = await adminForm(request, env);
  await deletePrediction(
    env.DB,
    requiredText(form, "player_id", 64),
    requiredText(form, "game_id", 64),
  );
  return redirect("/admin?status=prediction-deleted#predictions");
}

export async function runEspnSync(request: Request, env: AppEnv): Promise<Response> {
  await adminForm(request, env);
  try {
    const result = await syncEspnGames(env);
    return redirect(`/admin?status=sync-ok&seen=${result.seen}&changed=${result.changed}&season=${result.season}#sync`);
  } catch {
    return redirect("/admin?status=sync-error#sync");
  }
}
