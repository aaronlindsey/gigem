import { HttpError } from "./errors";
import { shouldFetchOnSchedule, syncEspnGames } from "./espn";
import { htmlResponse, jsonResponse } from "./http";
import {
  addGame,
  addPlayer,
  editGame,
  editPlayer,
  removeGame,
  removePlayer,
  removePrediction,
  runEspnSync,
  saveAdminPrediction,
  showAdmin,
} from "./routes/admin";
import { savePlayerPrediction, showPlayerScores } from "./routes/player";
import { showGameDetails, showScoreboard } from "./routes/public";
import type { AppEnv } from "./types";
import { errorPage } from "./views/error";

function match(pathname: string, pattern: RegExp): string | null {
  const result = pathname.match(pattern);
  return result ? decodeURIComponent(result[1]) : null;
}

async function staticAsset(request: Request, env: AppEnv): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, headers });
}

async function handleRequest(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method === "GET" && (pathname === "/styles.css" || pathname === "/app.js" || pathname.startsWith("/images/"))) {
    return staticAsset(request, env);
  }
  if (method === "GET" && pathname === "/health") {
    return jsonResponse({ status: "ok" });
  }
  if (method === "GET" && pathname === "/") return showScoreboard(request, env);
  if (method === "GET" && pathname === "/scores") return showPlayerScores(request, env);
  if (method === "GET" && pathname === "/admin") return showAdmin(request, env);

  const gameDetailsId = match(pathname, /^\/games\/([^/]+)$/);
  if (method === "GET" && gameDetailsId) return showGameDetails(request, env, gameDetailsId);

  const playerPredictionGameId = match(pathname, /^\/scores\/predictions\/([^/]+)$/);
  if (method === "POST" && playerPredictionGameId) {
    return savePlayerPrediction(request, env, playerPredictionGameId);
  }

  if (method === "POST" && pathname === "/admin/games") return addGame(request, env);
  if (method === "POST" && pathname === "/admin/players") return addPlayer(request, env);
  if (method === "POST" && pathname === "/admin/predictions") {
    return saveAdminPrediction(request, env);
  }
  if (method === "POST" && pathname === "/admin/predictions/delete") {
    return removePrediction(request, env);
  }
  if (method === "POST" && pathname === "/admin/sync") return runEspnSync(request, env);

  const deleteGameId = match(pathname, /^\/admin\/games\/([^/]+)\/delete$/);
  if (method === "POST" && deleteGameId) return removeGame(request, env, deleteGameId);
  const editGameId = match(pathname, /^\/admin\/games\/([^/]+)$/);
  if (method === "POST" && editGameId) return editGame(request, env, editGameId);
  const deletePlayerId = match(pathname, /^\/admin\/players\/([^/]+)\/delete$/);
  if (method === "POST" && deletePlayerId) return removePlayer(request, env, deletePlayerId);
  const editPlayerId = match(pathname, /^\/admin\/players\/([^/]+)$/);
  if (method === "POST" && editPlayerId) return editPlayer(request, env, editPlayerId);

  throw new HttpError(404, "We couldn't find that page.");
}

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const httpError = error instanceof HttpError ? error : null;
      const status = httpError?.status ?? 500;
      const message = httpError?.expose
        ? httpError.message
        : "An unexpected error occurred. Please try again.";
      if (!httpError || status >= 500) console.error(error);
      return htmlResponse(errorPage(status, message), status);
    }
  },

  async scheduled(_controller: ScheduledController, env: AppEnv, context: ExecutionContext): Promise<void> {
    const now = new Date();
    if (!shouldFetchOnSchedule(now)) return;
    context.waitUntil(
      syncEspnGames(env, now).then(
        (result) => console.log(`ESPN sync: ${result.seen} seen, ${result.changed} written.`),
        (error) => console.error("ESPN sync failed", error),
      ),
    );
  },
} satisfies ExportedHandler<AppEnv>;
