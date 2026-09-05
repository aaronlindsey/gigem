import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8787",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/e2e/mock-espn.mjs",
      port: 8790,
      reuseExistingServer: false,
      stdout: "pipe",
    },
    {
      command: "wrangler dev --local --persist-to .wrangler/e2e --port 8787 --var ENVIRONMENT:test --var ADMIN_EMAIL:admin@example.com --var ACCESS_TEAM_DOMAIN:local.invalid --var ACCESS_AUD:local-test --var ESPN_API_BASE_URL:http://127.0.0.1:8790",
      port: 8787,
      reuseExistingServer: false,
      timeout: 30_000,
      stdout: "pipe",
    },
  ],
});
