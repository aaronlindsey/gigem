import { recordSyncFailure, recordSyncSuccess, upsertSyncedGames } from "./db";
import type { AppEnv, SyncedGame } from "./types";

const TEXAS_AM_TEAM_ID = "245";
const PROVIDER = "espn";

export interface ScheduleProvider {
  getGames(season: number): Promise<SyncedGame[]>;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function competitorTeamId(value: unknown): string | null {
  return text(object(object(value)?.team)?.id);
}

function competitorScore(value: unknown): number | null {
  const score = object(object(value)?.score);
  const candidate = score?.value ?? score?.displayValue;
  const parsed = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

export function parseEspnSchedule(payload: unknown): SyncedGame[] {
  const root = object(payload);
  if (!root || !Array.isArray(root.events)) {
    throw new Error("ESPN response did not contain an events array.");
  }

  const games: SyncedGame[] = [];
  for (const rawEvent of root.events) {
    const event = object(rawEvent);
    if (!event) continue;
    const externalId = text(event.id);
    const competition = object(array(event.competitions)[0]);
    if (!externalId || !competition) continue;

    const competitors = array(competition.competitors);
    const aggies = competitors.find((candidate) => competitorTeamId(candidate) === TEXAS_AM_TEAM_ID);
    const opponent = competitors.find((candidate) => competitorTeamId(candidate) !== TEXAS_AM_TEAM_ID);
    const opponentTeam = object(object(opponent)?.team);
    const opponentName = text(opponentTeam?.shortDisplayName) ?? text(opponentTeam?.displayName);
    const date = text(competition.date) ?? text(event.date);
    const startsAtMilliseconds = date ? Date.parse(date) : Number.NaN;

    if (!aggies || !opponent || !opponentName || !Number.isFinite(startsAtMilliseconds)) {
      continue;
    }

    const completed = object(object(competition.status)?.type)?.completed === true;
    const actualScore = completed ? competitorScore(aggies) : null;
    if (completed && actualScore === null) {
      throw new Error(`ESPN marked event ${externalId} final without an Aggie score.`);
    }

    games.push({
      externalId,
      opponent: opponentName.slice(0, 120),
      startsAt: Math.floor(startsAtMilliseconds / 1000),
      actualScore,
    });
  }

  if (root.events.length > 0 && games.length === 0) {
    throw new Error("ESPN response contained events but no valid Texas A&M games.");
  }
  return games;
}

export class EspnScheduleProvider implements ScheduleProvider {
  constructor(private readonly baseUrl: string) {}

  async getGames(season: number): Promise<SyncedGame[]> {
    const url = new URL(
      `/apis/site/v2/sports/football/college-football/teams/${TEXAS_AM_TEAM_ID}/schedule`,
      this.baseUrl,
    );
    url.searchParams.set("season", String(season));
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "gigem/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`ESPN returned HTTP ${response.status}.`);
    }
    return parseEspnSchedule(await response.json());
  }
}

export function footballSeason(now = new Date()): number {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() === 0 ? year - 1 : year;
}

export function configuredSeason(env: AppEnv, now = new Date()): number {
  if (env.ESPN_SEASON && /^\d{4}$/.test(env.ESPN_SEASON)) {
    return Number(env.ESPN_SEASON);
  }
  return footballSeason(now);
}

export interface SyncResult {
  seen: number;
  changed: number;
  season: number;
}

export async function syncEspnGames(env: AppEnv, now = new Date()): Promise<SyncResult> {
  const attemptedAt = Math.floor(now.getTime() / 1000);
  const season = configuredSeason(env, now);
  const provider = new EspnScheduleProvider(env.ESPN_API_BASE_URL ?? "https://site.api.espn.com");
  try {
    const games = await provider.getGames(season);
    const changed = await upsertSyncedGames(env.DB, games, attemptedAt);
    await recordSyncSuccess(env.DB, attemptedAt, games.length, changed);
    return { seen: games.length, changed, season };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ESPN synchronization error.";
    await recordSyncFailure(env.DB, attemptedAt, message);
    throw error;
  }
}

export function shouldFetchOnSchedule(now: Date): boolean {
  const month = now.getUTCMonth();
  const inSeason = month >= 6 || month === 0;
  return inSeason || (now.getUTCDate() === 1 && now.getUTCHours() < 6);
}

export { PROVIDER as ESPN_PROVIDER };
