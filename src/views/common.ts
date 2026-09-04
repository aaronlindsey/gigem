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

export function formatGameDateUtc(game: Game): string {
  const date = formatUtcDate(game.starts_at, Boolean(game.kickoff_time_tbd));
  return game.kickoff_time_tbd ? `${date} · Time TBD` : date;
}

export function utcInput(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 16);
}

export function scoreText(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

interface LayoutOptions {
  title: string;
  body: string;
  authenticatedEmail?: string;
  admin?: boolean;
  description?: string;
}

export function layout(options: LayoutOptions): string {
  const account = options.authenticatedEmail
    ? `<span class="nav-identity">${escapeHtml(options.authenticatedEmail)}</span>
       <a href="/cdn-cgi/access/logout">Sign out</a>`
    : "";
  const admin = options.admin ? '<a href="/admin">Admin</a>' : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#500000">
  <meta name="description" content="${escapeHtml(options.description ?? "Texas A&M football score predictions")}">
  <title>${escapeHtml(options.title)} · Gig'em</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/app.js" defer></script>
</head>
<body>
  <header class="site-header">
    <nav class="nav shell" aria-label="Main navigation">
      <a class="brand" href="/" aria-label="Gig'em scoreboard"><span aria-hidden="true">★</span> Gig'em!</a>
      <div class="nav-links">
        <a href="/">Scoreboard</a>
        <a href="/scores">My Scores</a>
        ${admin}
        ${account}
      </div>
    </nav>
  </header>
  <main class="shell">${options.body}</main>
  <footer class="site-footer shell">
    <img src="/images/ol-sarge.png" alt="Ol' Sarge">
    <p>Gig'em, Aggies! <span aria-hidden="true">👍</span></p>
  </footer>
</body>
</html>`;
}

export function notice(message: string, kind: "success" | "error" = "success"): string {
  return `<div class="notice notice-${kind}" role="status">${escapeHtml(message)}</div>`;
}

export function emptyState(title: string, message: string): string {
  return `<section class="empty-state"><div class="empty-star" aria-hidden="true">★</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></section>`;
}
