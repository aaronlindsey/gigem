import { escapeHtml, layout } from "./common";

export function errorPage(status: number, message: string): string {
  const title = status === 404 ? "Page not found" : status === 403 ? "Not on this yell squad" : status === 401 ? "Sign in required" : status >= 500 ? "Something went sideways" : "Hold up";
  return layout({
    title,
    body: `<section class="error-panel"><p class="error-code">${status}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a class="button" href="/">Return to the scoreboard</a></section>`,
  });
}
