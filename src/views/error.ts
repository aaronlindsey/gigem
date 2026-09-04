import { escapeHtml, layout } from "./common";

export function errorPage(status: number, message: string): string {
  return layout({
    title: "Bad bull!",
    body: `<section class="error-panel"><p class="error-code">${status}</p><h1>Bad bull!</h1><p>${escapeHtml(message)}</p><a class="button" href="/">Return to the leaderboard</a></section>`,
  });
}
