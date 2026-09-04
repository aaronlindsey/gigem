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
  await expect(playerPage.locator("[data-testid=player-total]")).toHaveText("25");
  await expect(playerPage.locator("[data-testid=score-game-game-2]")).toContainText("Dropped");
  await expect(playerPage.locator("[data-testid=score-game-game-2] s")).toHaveText("+20");
  await expect(playerPage.locator("[data-testid=score-game-game-3]")).toContainText("Whoop! −5 bonus");

  const futureInput = playerPage.locator("#prediction-game-future");
  await expect(futureInput).toHaveValue("33");
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

test("ESPN sync is authenticated and idempotent", async ({ browser }) => {
  const unknownContext = await browser.newContext({
    extraHTTPHeaders: { "x-local-auth-email": "stranger@example.com" },
  });
  const unknownPage = await unknownContext.newPage();
  await unknownPage.goto("/scores");
  await expect(unknownPage.getByText("not on the player roster")).toBeVisible();
  await unknownPage.goto("/admin");
  await expect(unknownPage.getByText("reserved for the game administrator")).toBeVisible();
  await unknownContext.close();

  const adminContext = await browser.newContext({
    extraHTTPHeaders: { "x-local-auth-email": "admin@example.com" },
  });
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/");
  await expect(adminPage.locator(".nav-identity")).toHaveText("admin@example.com");
  await expect(adminPage.getByRole("link", { name: "Admin", exact: true })).toBeVisible();

  await adminPage.goto("/admin");
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByText(/sync complete: 2 seen, 2 written/)).toBeVisible();
  const tbdGame = adminPage.locator("#games > details.admin-card", { hasText: "Mock University" });
  await expect(tbdGame).toHaveCount(1);
  await expect(tbdGame).toContainText("Time TBD");
  await expect(tbdGame.locator('input[name="kickoff_time_tbd"]')).toBeChecked();
  await expect(adminPage.locator("#games > details.admin-card", { hasText: "Final State" })).toContainText("Final: 42");

  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByText(/sync complete: 2 seen, 0 written/)).toBeVisible();
  await expect(adminPage.locator("#games > details.admin-card", { hasText: "Mock University" })).toHaveCount(1);
  await adminContext.close();
});
