import type { Game } from "../types";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(timestamp: number | null): string {
  if (timestamp === null) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

export function formatGameDate(game: Game): string {
  if (!game.kickoff_time_tbd) return formatDate(game.starts_at);
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(game.starts_at * 1000));
  return `${date} · Time TBD`;
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
