import { expect, test } from "@playwright/test";

test("calculates absolute scores, bonuses, and relative drops", async ({ browser, page }) => {
  await page.goto("/");
  const standings = page.locator("[data-testid=standings] > li");
  await expect(standings).toHaveCount(3);
  await expect(standings.nth(0)).toHaveAttribute("data-player", "Carol");
  await expect(standings.nth(1)).toHaveAttribute("data-player", "Bob");
  await expect(standings.nth(2)).toHaveAttribute("data-player", "Alice");
  await expect(page.locator("[data-testid=total-carol]")).toHaveText("20");
  await expect(page.locator("[data-testid=total-bob]")).toHaveText("24");
  await expect(page.locator("[data-testid=total-alice]")).toHaveText("25");

  await page.goto("/games/game-future");
  await expect(page.getByText("Picks are under wraps")).toBeVisible();
  await expect(page.getByText("Alice")).toHaveCount(0);

  await page.goto("/games/game-tbd");
  await expect(page.getByText(/Time TBD/)).toBeVisible();
  await expect(page.getByText("Picks are under wraps")).toBeVisible();

  await page.goto("/games/game-1");
  await expect(page.getByRole("row", { name: /Alice 10 \+30/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Carol 0 \(no pick\) \+40/ })).toBeVisible();

  const playerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: { "x-local-auth-email": "alice@example.com" },
  });
  const playerPage = await playerContext.newPage();
  await playerPage.goto("/");
  await expect(playerPage.locator(".nav-identity")).toHaveText("alice@example.com");
  await expect(playerPage.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);

  await playerPage.goto("/scores");
  await expect(playerPage.getByRole("heading", { name: "Howdy, Alice!" })).toBeVisible();
  await expect(playerPage.locator("[data-testid=player-total]")).toHaveText("25");
  const orderedGameIds = await playerPage.locator("[data-testid^=score-game-]").evaluateAll((cards) =>
    cards.map((card) => card.getAttribute("data-testid")),
  );
  expect(orderedGameIds).toEqual([
    "score-game-game-1",
    "score-game-game-2",
    "score-game-game-3",
    "score-game-game-started",
    "score-game-game-tbd",
    "score-game-game-future",
  ]);
  await expect(playerPage.locator(".featured-pick")).toHaveAttribute("data-testid", "score-game-game-tbd");
  await expect(playerPage.locator("[data-testid=score-game-game-2]")).toContainText("Dropped");
  await expect(playerPage.locator("[data-testid=score-game-game-2] s")).toHaveText("+20");
  await expect(playerPage.locator("[data-testid=score-game-game-3]")).toContainText("Whoop! −5 bonus");

  const futureInput = playerPage.locator("#prediction-game-future");
  await expect(futureInput).toHaveValue("33");
  const futureForm = futureInput.locator("xpath=ancestor::form");
  const increment = futureForm.getByRole("button", { name: "Increase prediction" });
  await increment.click();
  await increment.click();
  await increment.click();
  await expect(futureInput).toHaveValue("36");
  await futureInput.fill("44");
  await futureInput.locator("xpath=ancestor::form").getByRole("button", { name: "Save" }).click();
  await expect(playerPage.getByText("Prediction saved. Good bull!")).toBeVisible();
  await expect(futureInput).toHaveValue("44");

  const tbdGame = playerPage.locator("[data-testid=score-game-game-tbd]");
  await expect(tbdGame).toContainText("Time TBD");
  await expect(tbdGame).toContainText("Open");
  const tbdInput = playerPage.locator("#prediction-game-tbd");
  await tbdInput.fill("45");
  await tbdInput.locator("xpath=ancestor::form").getByRole("button", { name: "Save" }).click();
  await expect(tbdInput).toHaveValue("45");

  const resultUrl = await playerPage.evaluate(async () => {
    const response = await fetch("/scores/predictions/game-started", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "predicted_score=55",
    });
    return response.url;
  });
  expect(resultUrl).toContain("status=locked");
  await playerPage.goto("/scores");
  await expect(playerPage.locator("[data-testid=score-game-game-started]")).toContainText("22");
  const dimensions = await playerPage.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await playerContext.close();
});

test("displays times in the browser time zone", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "America/Los_Angeles" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/images/ol-sarge-favicon-32.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/images/apple-touch-icon.png");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/images/site.webmanifest");
  const manifestResponse = await page.request.get("/images/site.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    icons: [{ sizes: "192x192" }, { sizes: "512x512" }],
  });

  await page.goto("/games/game-future");
  const kickoff = page.locator("time[data-compact-game-date]");
  const expected = await kickoff.evaluate((element) => {
    const date = new Date((element as HTMLTimeElement).dateTime);
    const dateText = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
    const timeText = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
    return `${dateText} · ${timeText}`;
  });
  await expect(kickoff).toHaveText(expected);
  await expect(kickoff).toHaveAttribute("title", /P[DS]T/);

  await context.close();
});

test("ESPN sync is authenticated and idempotent", async ({ browser }) => {
  const unknownContext = await browser.newContext({
    extraHTTPHeaders: { "x-local-auth-email": "stranger@example.com" },
  });
  const unknownPage = await unknownContext.newPage();
  await unknownPage.goto("/scores");
  await expect(unknownPage.getByText("not on the player roster")).toBeVisible();
  await unknownPage.goto("/admin");
  await expect(unknownPage.getByRole("heading", { name: "Bad bull!" })).toBeVisible();
  await expect(unknownPage.getByText("reserved for the game administrator")).toBeVisible();
  await expect(unknownPage.getByRole("link", { name: "Return to the leaderboard" })).toBeVisible();
  await unknownContext.close();

  const adminContext = await browser.newContext({
    extraHTTPHeaders: { "x-local-auth-email": "admin@example.com" },
    timezoneId: "America/Los_Angeles",
  });
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/");
  await expect(adminPage.locator(".nav-identity")).toHaveText("admin@example.com");
  await expect(adminPage.getByRole("link", { name: "Admin", exact: true })).toBeVisible();

  await adminPage.goto("/admin");
  const hiddenPrediction = adminPage.locator("details.prediction-admin-row", {
    hasText: /Alice.*Future State/,
  });
  const hiddenPredictionInput = hiddenPrediction.locator('input[name="predicted_score"]');
  await expect(hiddenPredictionInput).toBeHidden();
  await hiddenPrediction.locator("summary").click();
  await expect(hiddenPredictionInput).toBeVisible();

  const futureGame = adminPage.locator("#games > details.admin-card", { hasText: "Future State" });
  await futureGame.locator("summary").click();
  const gameForm = futureGame.locator("form").first();
  const localStartInput = gameForm.locator('input[name="starts_at_local"]');
  const utcStartInput = gameForm.locator('input[name="starts_at"]');
  await localStartInput.fill("2030-09-01T12:00");
  await expect(utcStartInput).toHaveValue("2030-09-01T19:00:00.000Z");

  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByText(/sync complete: 2 seen, 2 written/)).toBeVisible();
  const tbdGame = adminPage.locator("#games > details.admin-card", { hasText: "Mock University" });
  await expect(tbdGame).toHaveCount(1);
  await expect(tbdGame).toContainText("Time TBD");
  await expect(tbdGame.locator('input[name="kickoff_time_tbd"]')).toBeChecked();
  await expect(tbdGame.locator('select[name="site"]')).toHaveValue("away");
  await expect(tbdGame.locator('input[name="venue"]')).toHaveValue("Mock Stadium");
  await expect(tbdGame.locator('input[name="opponent_abbreviation"]')).toHaveValue("MU");
  await expect(adminPage.locator("#games > details.admin-card", { hasText: "Final State" })).toContainText("Final: 42");

  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByText(/sync complete: 2 seen, 0 written/)).toBeVisible();
  await expect(adminPage.locator("#games > details.admin-card", { hasText: "Mock University" })).toHaveCount(1);
  await adminContext.close();
});
