export interface AppEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ADMIN_EMAIL?: string;
  LOCAL_AUTH_EMAIL?: string;
  ESPN_API_BASE_URL?: string;
  ESPN_SEASON?: string;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  created_at: number;
  updated_at: number;
}

export type GameSite = "home" | "away" | "neutral";

export interface Game {
  id: string;
  opponent: string;
  opponent_abbreviation: string | null;
  venue: string | null;
  site: GameSite;
  starts_at: number;
  kickoff_time_tbd: number;
  actual_score: number | null;
  external_source: string | null;
  external_id: string | null;
  sync_locked: number;
  created_at: number;
  updated_at: number;
}

export interface Prediction {
  player_id: string;
  game_id: string;
  predicted_score: number;
  submitted_at: number;
  updated_at: number;
}

export interface SyncStatus {
  provider: string;
  last_attempt_at: number | null;
  last_success_at: number | null;
  last_error: string | null;
  records_seen: number;
  records_changed: number;
}

export interface SyncedGame {
  externalId: string;
  opponent: string;
  opponentAbbreviation: string | null;
  venue: string | null;
  site: GameSite;
  startsAt: number;
  kickoffTimeTbd: boolean;
  actualScore: number | null;
}
