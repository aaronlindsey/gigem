# Gig'em

A Texas A&M football score-prediction game built with TypeScript,
Cloudflare Workers, D1, and Cloudflare Access.

## Why I made this

My family has a competition to guess the score of each Texas A&M football game—I thought it would be fun to turn this into a simple app!

## How the game works

Players predict how many points Texas A&M will score in each game. A prediction
locks at the game's kickoff time.

- A completed game's raw score is `abs(prediction - actual Aggie score)`.
- An exact prediction earns a `-5` game score.
- A missing prediction is scored as a prediction of zero.
- After at least two final games, one game is dropped for each player. The
  dropped game is the one where that player's raw error is farthest from the
  best raw error in that game. This makes an unusually high-scoring game fair
  without making every displayed score relative.
- Tied drop candidates use the larger credited score, then start time and game
  ID, so results are deterministic and favor the player.
- Lowest season total wins.

The scoreboard and post-kickoff game details are public. Players sign in by
email to enter predictions and inspect their complete score sheet. Only the
configured administrator can change games, players, or another player's pick.

## Architecture

- A single TypeScript Worker with native Fetch/Web Crypto APIs
- D1 with prepared SQL and numbered migrations
- Server-rendered HTML, handwritten CSS, and a tiny progressive-enhancement
  script
- Cloudflare Access email one-time PIN identity
- A scheduled ESPN schedule/final-score sync
- Playwright browser E2E tests

There is no runtime framework, ORM, client framework, CSS framework, external
font, or CDN dependency.

## Local development

Prerequisites:

- Node.js 22 or newer
- npm

Install and prepare an isolated local D1 database:

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Open <http://localhost:8787>. The example development identity is
`player@example.com`. Change `LOCAL_AUTH_EMAIL` in `.dev.vars` to test another
player. Local/test identity overrides are ignored when `ENVIRONMENT=production`.
Never put a real secret in `.dev.vars.example`.

Useful commands:

```sh
npm run typecheck          # regenerate Worker types and run TypeScript checks
npm run db:migrate:local   # apply pending migrations to local D1
npm run db:seed:local      # load disposable demo data
npm run dev                # run Worker and D1 locally
```

Game and sync times are stored in UTC and displayed in each visitor's browser
time zone, including its short time-zone label. Admin game start inputs also use
the administrator's browser time zone and are converted to UTC when submitted.

## E2E tests

Install Playwright's browser once, then run the suite:

```sh
npx playwright install chromium
npm run test:e2e
```

The command deletes only `.wrangler/e2e`, migrates a new test database, loads a
deterministic fixture, starts a mock ESPN endpoint and local Worker, and runs two
browser scenarios. It verifies absolute errors, missing picks, exact bonuses,
relative drop selection, standings, kickoff locking, unknown-player rejection,
and idempotent schedule sync. It does not use or modify the normal local D1
database.

## Production D1 and Worker setup

1. Authenticate Wrangler and create the database:

   ```sh
   npx wrangler login
   npx wrangler d1 create gigem
   ```

2. The checked-in D1 binding identifies the database by name, so Wrangler
   resolves its ID from the authenticated Cloudflare account. Set
   `ACCESS_TEAM_DOMAIN` to the Zero Trust team domain and set `ACCESS_AUD` to
   the Access application audience tags, comma-separated when the player and
   admin paths use separate applications.
3. Store the administrator email as a secret:

   ```sh
   npx wrangler secret put ADMIN_EMAIL
   ```

4. Apply the schema and deploy:

   ```sh
   npm run typecheck
   npm run db:migrate:remote
   npx wrangler deploy
   ```

`npm run deploy` combines the final three commands after configuration is
complete. Migrations are forward-only. Before a destructive schema or admin
change, export D1 with `wrangler d1 export gigem --remote --output backup.sql`.
A Worker code regression can be rolled back from Workers & Pages > Deployments;
a data rollback requires an export or a corrective migration.

The application's request and D1 volume is intentionally tiny and should fit
comfortably in the Workers/D1 free tier. Check Cloudflare's current limits
before materially expanding usage.

## Cloudflare Access setup

In Zero Trust:

1. Enable **Settings > Authentication > One-time PIN**.
2. Create a self-hosted Access application covering `/scores` and
   `/scores/*`. Set its session duration to **1 month**. Its Allow policy may
   include everyone who can complete an email OTP; the Worker still denies any
   email absent from the D1 `players` table. This avoids maintaining a second
   player allowlist in Zero Trust.
3. Create a second self-hosted application covering `/admin` and `/admin/*`,
   also with a one-month session, whose Allow policy contains only the admin
   email.
4. Copy both applications' AUD tags into the comma-separated `ACCESS_AUD`
   Worker variable. Both applications must use the same Zero Trust team domain.
5. Ensure the protected paths include their POST subpaths. Keep `/`, `/games/*`,
   `/health`, and static assets outside Access so public pages remain public.

The Worker validates the `Cf-Access-Jwt-Assertion` header (or the
`CF_Authorization` cookie on the public scoreboard) against the team's published
JWKs and checks issuer, audience, and expiration. The scoreboard uses a valid
existing session to show the account email and an Admin link for the configured
administrator, but remains public when no valid session is present. Protected
player routes then look up the JWT email in D1. The admin route additionally
compares it with the `ADMIN_EMAIL` secret. Adding or deleting a player in Admin
therefore grants or revokes application access immediately; no player token or
secret URL exists.

Cloudflare Access handles sending the email code and its authorization cookie.
The application does not store passwords, OTPs, or sessions.

## Administration

Visit `/admin` after Access is configured. The dashboard can:

- Add, edit, and delete players and games
- Set game venues, home/away/neutral sites, and opponent abbreviations
- Set or clear Aggie final scores
- Add, replace, or delete any prediction, even after kickoff
- Run the ESPN sync and inspect its last status
- Lock an ESPN-linked game against subsequent automatic changes

Deleting a player or game cascades to its predictions and can recalculate
historical standings. The UI requires confirmation but intentionally does not
archive records.

## ESPN synchronization

A cron trigger runs every three minutes. During football season (July through
January) each invocation fetches Texas A&M's current ESPN schedule so a newly
final score normally reaches the leaderboard within a few minutes. From
February through June, code skips all but one fetch on the first day of each
month. January is associated with the previous season so postseason games stay
attached to the correct schedule.

The provider uses Texas A&M's ESPN team ID `245`:

```text
https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/245/schedule?season=YEAR
```

For each valid event it:

- adds a missing game using ESPN's event ID;
- updates opponent names, abbreviations, venues, home/away sites, and
  pre-kickoff start times;
- marks kickoff times as TBD when ESPN reports `timeValid: false`, keeping picks
  open until ESPN publishes a time;
- imports the Aggie score only when ESPN marks the event completed;
- never deletes a game omitted from ESPN;
- never changes a game whose **Prevent ESPN from changing this game** checkbox
  is set.

The dashboard's **Sync now** button uses the same path and records the last
attempt, success, error, records seen, and records changed. Set an optional
`ESPN_SEASON` Worker variable to force a season during unusual schedule windows.

This ESPN endpoint is an undocumented site API with no published rate limit,
compatibility guarantee, or uptime SLA. One request every three minutes (480 per
day) is modest traffic, but ESPN could still throttle it without notice. The
parser validates its input and a failure leaves existing D1 data alone, but
manual administration remains the fallback if ESPN changes it. Review ESPN's
current terms before production use.

## Security notes

- Predictions are hidden publicly until the Worker clock reaches kickoff. Games
  with a TBD kickoff remain hidden and open for picks until a time is published.
- Player writes use a conditional D1 statement, so a request racing kickoff
  cannot save late.
- Protected pages are `no-store`; static assets are cached.
- Rendered data is HTML-escaped, mutation forms require a same-origin browser
  request, and responses set CSP, frame, MIME, referrer, and permissions
  headers.
- Production fails closed when Access or admin configuration is absent.
- Admin overrides intentionally bypass kickoff but still require nonnegative
  integer scores.
