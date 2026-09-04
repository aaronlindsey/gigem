import type { Game } from "../types";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatUtcDate(timestamp: number, dateOnly = false): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(dateOnly ? {} : {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  }).format(new Date(timestamp * 1000));
}

function formatCompactUtcDate(timestamp: number, dateOnly = false): string {
  const value = new Date(timestamp * 1000);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
  if (dateOnly) return date;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
  return `${date} · ${time}`;
}

export function localDate(timestamp: number | null, dateOnly = false): string {
  if (timestamp === null) return "Never";
  const iso = new Date(timestamp * 1000).toISOString();
  const attribute = dateOnly ? "data-local-date" : "data-local-date-time";
  return `<time datetime="${iso}" ${attribute}>${escapeHtml(formatUtcDate(timestamp, dateOnly))}</time>`;
}

export function localGameDate(game: Game): string {
  const date = localDate(game.starts_at, Boolean(game.kickoff_time_tbd));
  return game.kickoff_time_tbd ? `${date} · Time TBD` : date;
}

export function compactGameDate(game: Game): string {
  const iso = new Date(game.starts_at * 1000).toISOString();
  const date = formatCompactUtcDate(game.starts_at, Boolean(game.kickoff_time_tbd));
  return `<time datetime="${iso}" data-compact-game-date${game.kickoff_time_tbd ? " data-date-only" : ""}>${escapeHtml(date)}${game.kickoff_time_tbd ? " · Time TBD" : ""}</time>`;
}

export function formatGameDateUtc(game: Game): string {
  const date = formatUtcDate(game.starts_at, Boolean(game.kickoff_time_tbd));
  return game.kickoff_time_tbd ? `${date} · Time TBD` : date;
}

export function utcInput(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 16);
}

export function scoreText(score: number): string {
  return score > 0 ? `+${score}` : String(score).replace("-", "−");
}

export function gameLabel(game: Game): string {
  return `${game.site === "away" ? "@" : "vs."} ${game.opponent}`;
}

export function opponentMark(game: Game): string {
  if (game.opponent_abbreviation) return game.opponent_abbreviation.toUpperCase();
  const words = game.opponent.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  return (words[0] ?? "OPP").slice(0, 3).toUpperCase();
}

function navIcon(name: "board" | "picks" | "admin"): string {
  if (name === "board") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10m7 10V4m7 16v-7"/><path d="M3 20h18"/></svg>';
  }
  if (name === "picks") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="m8 11 2 2 5-5M8 17h8"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4zM8 7V4h8v3"/><path d="M9 12h6m-3-3v6"/></svg>';
}

interface LayoutOptions {
  title: string;
  body: string;
  authenticatedEmail?: string;
  admin?: boolean;
  active?: "board" | "picks" | "admin";
  description?: string;
}

export function layout(options: LayoutOptions): string {
  const account = options.authenticatedEmail
    ? `<details class="account-menu">
         <summary aria-label="Account menu for ${escapeHtml(options.authenticatedEmail)}">
           <span class="nav-identity" title="${escapeHtml(options.authenticatedEmail)}">${escapeHtml(options.authenticatedEmail)}</span>
           <svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>
         </summary>
         <div class="account-popover">
           <span class="account-email">${escapeHtml(options.authenticatedEmail)}</span>
           <a href="/cdn-cgi/access/logout">Sign out</a>
         </div>
       </details>`
    : '<a class="account-sign-in" href="/scores">Sign in</a>';
  const navItem = (href: string, label: string, name: "board" | "picks" | "admin") =>
    `<a href="${href}" class="${options.active === name ? "is-active" : ""}" ${options.active === name ? 'aria-current="page"' : ""}>${navIcon(name)}<span>${label}</span></a>`;
  const admin = options.admin ? navItem("/admin", "Admin", "admin") : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#20030a">
  <meta name="description" content="${escapeHtml(options.description ?? "Texas A&M football score predictions")}">
  <title>${escapeHtml(options.title)} · Gig'em</title>
  <link rel="icon" type="image/png" sizes="32x32" href="/images/ol-sarge-favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
  <link rel="manifest" href="/images/site.webmanifest">
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" defer></script>
</head>
<body>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Gig'em scoreboard"><span>GIG</span><b>’EM!</b></a>
      ${account}
    </header>
    <main>${options.body}</main>
  </div>
  <nav class="bottom-nav${options.admin ? " has-admin" : ""}" aria-label="Primary navigation">
    ${navItem("/", "Leaderboard", "board")}
    ${navItem("/scores", "My picks", "picks")}
    ${admin}
  </nav>
</body>
</html>`;
}

export function notice(message: string, kind: "success" | "error" = "success"): string {
  return `<div class="notice notice-${kind}" role="status">${escapeHtml(message)}</div>`;
}

export function emptyState(title: string, message: string): string {
  return `<section class="empty-state"><span aria-hidden="true">12</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></section>`;
}
