# F7

F7 is a mobile-first, single-player apartment-life simulation about Barbod, Kavian, Mahan, Parsa and Parham. The design calls for a fixed top-down view of their real apartment. The player directs meaningful tasks while the friends act semi-autonomously. Faaz pays for unlocks. F7 Score ranks players.

## Run F7 locally

The home page displays the supplied apartment plan in a fixed Phaser viewport. **Map geometry** overlays the traced walls, furniture collisions, doorways and anchor points. The character asset preview is available from the header. Both pages work with the API offline. The apartment includes its own background music and works without uploaded tracks.

Tap a friend or their above-head request, tap a highlighted station, then choose an item in the popup. For Parsa, choose تهیه ژله at خوراکی. He walks to the counter and stores the jelly. When the fridge shows readiness, select him again and choose خوردن ژله. For Mahan, select بالکن then سیگار or آیکوس. The whole apartment stays visible. The interface and tutorial are Persian. Character art is provisional. Revision 17 defines the current gameplay requirements, and revision 18 lists candidates by approval status. The apartment saves locally during play, and interrupted requests retain their original identity.

Tap the apartment or use a friend control to start **Hall Lights**, an original 37-second background loop. **Sound settings** in the header also has a **Start sound** button. Incoming requests use a rising two-note chime, completed requests use three notes, and expired requests use a descending chime. The master, music and alert volumes and mute setting are saved on this device. Set music volume to zero to hear only alerts. Audio pauses when you leave the tab.

Use Node 24.13 or newer with npm, Go 1.27.4 or newer (or a Go installation with automatic toolchain selection), Docker with Compose v2 or newer, Make, Bash, OpenSSL and the `migrate` CLI with the PostgreSQL driver. On macOS with Homebrew, `brew install golang-migrate` supplies the CLI. To install the version used in CI with Go:

```sh
go install -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.20.1
export PATH="$(go env GOPATH)/bin:$PATH"
```

From the repository root, with the Docker engine running:

```sh
make init install
make dev-deps migrate-up
make api-run
```

In another terminal at the same root:

```sh
make web-dev
```

Open http://127.0.0.1:5173. Under **Character assets**, select a friend with touch, mouse or keyboard. **Check connection** queries PostgreSQL through the API. Vite proxies `/api` on the same origin. To check the API directly:

```sh
curl -i http://127.0.0.1:8080/api/v1/health/live
curl -i http://127.0.0.1:8080/api/v1/health/ready
```

Liveness returns HTTP 200 while the process serves requests. Readiness returns 200 after a database round trip and 503 when PostgreSQL is unavailable, with a two-second probe deadline. Both responses disable caching. Stop the servers with Ctrl-C. Run `make compose-down` to stop PostgreSQL and keep its named data volume.

### Local configuration

`make init` creates a private, git-ignored `.env` from `.env.example` with a random password. Repeating it preserves existing settings. The local Make targets source this trusted file as shell assignments. Use shell quoting when a value contains spaces or special characters.

| Variable | Purpose and local default |
| --- | --- |
| `HTTP_ADDR` | API listen address and Vite proxy destination, `127.0.0.1:8080` |
| `PGHOST`, `PGPORT` | Database connection, `127.0.0.1:55432`. Compose publishes the port on loopback. |
| `PGUSER`, `PGDATABASE` | Local role and database, both `f7` |
| `PGPASSWORD` | Generated during initialization |
| `PGSSLMODE` | `disable` for local loopback development |

Set the desired ports before starting the services. PostgreSQL uses its initialization credentials when creating the volume. Keep the generated password for that volume or change the role password in PostgreSQL when rotating it.

### Playtest rewards and purchases

For a local economy playtest, set these values in the private `.env`, apply migrations with `make migrate-up`, then restart `make api-run` and `make web-dev`.

```sh
APP_ENV=local
F7_PLAYTEST=1
PUBLIC_WEB_ORIGIN=http://127.0.0.1:5173
```

Open the exact configured web origin. The local playtest automatically establishes a browser-specific session. Open فروشگاه, inspect an item, then confirm the purchase with فاز. Complete a friend's request to earn server-confirmed Faaz and F7 Score. The TV and PS4 cost Faaz. Requests completed offline after starting a session queue on this device for reconnection or **همگام‌سازی**. An unregistered playtest player needs the original session cookie to access their server data. Clearing site data also removes the local apartment and unsent receipts.

**Back up apartment** stores the five residents, household, simulated clock and current request in local PostgreSQL. **Restore backup** shows the version and timestamp before replacing this device’s apartment. A stale device gets a conflict and can keep its local state or restore the newer version. Backups preserve the server’s wallet, score and unlock ownership. A development session stays tied to its browser cookie.

The default configuration disables the playtest endpoints. With the playtest enabled, the API requires a loopback listener, peer and web origin. Development payouts, prices, eligibility and prerequisites live in `apps/api/internal/economy/playtest.json`. Release pricing and the launch identity provider remain open decisions.

### Accounts and cross-browser restore

To try verified accounts locally, run the following from the repository root. The account mode starts PostgreSQL and a loopback-only Mailpit inbox. Mailpit captures all messages locally.

```sh
make init install accounts-deps migrate-up
make accounts-api
```

Run `make web-dev` in a second terminal. Open the [default apartment](http://127.0.0.1:5173) and choose **Account**. Choose **Create an account**, enter a test email address, and open the verification link from the [local inbox](http://127.0.0.1:58025). The link lets the mailbox holder set the password. A guest who starts and completes verification in the same browser keeps their player ID, local apartment, unlocks and ledger.

Choose **Back up apartment** before changing devices. In a different browser, sign in through **Account**, open the apartment, and choose **Restore backup**. Confirm the version to restore. The server supplies the wallet, score and owned items. Each signed-in player has their own IndexedDB save slot on each browser. Sign-out preserves the local slot for that player's return.

The optional email adapter uses Argon2id and signed, single-use verification and recovery links. Password reset revokes existing account sessions. **Account** also supports a private display name. The local playtest accepts up to 32 characters and compares names case-insensitively. Release sign-in and display-name rules remain in the decision register.

`make accounts-api` selects the email provider, enables playtest prices and generates a private signing key in the ignored `.env.account-key` on first use. You can supply `F7_AUTH_SIGNING_KEY` as 32 random bytes encoded in hex. Set `F7_MAIL_SMTP_PORT` or `F7_MAIL_UI_PORT` to change the local mail ports. Use the address in `PUBLIC_WEB_ORIGIN` for the playtest. When a browser opens a page with another loopback hostname on a running Vite port, Vite redirects to that address so account cookies and local saves use the same origin. Ordinary `make api-run` keeps accounts disabled by default.

### Friend rankings

Open **Account → Friend rankings** while signed in. Shared rankings require an approved visibility policy. The local server currently reports that rankings are unavailable. Guest and signed-out requests require sign-in.

The ranking query uses only confirmed F7 Score transactions from the server-authorized accounts. Equal scores share a rank, and ties keep a stable order across pages. A change to the roster, displayed names or scores requires refreshing the standings. Spending Faaz leaves the ranking intact. PostgreSQL integration tests exercise the query with an explicit test audience.

### Database migrations

The versioned SQL pairs live in `apps/api/migrations`. Run `make migrate-up` to apply pending versions. `make migrate-down` rolls back **one version** on the configured local database. The M0 migration creates the empty `f7` namespace. Its rollback refuses to remove a populated schema. Migration history lives in `public.schema_migrations`. Apply migrations separately from API startup. Migration 000002 adds browser playtest sessions, event receipts, separate Faaz and score ledgers, and unlock ownership. Rolling back that migration deletes those records on the configured database. Migration 000003 adds versioned player saves. Rolling it back deletes the PostgreSQL apartment backups. Migration 000004 adds credentials, profiles, challenge tokens, account sessions and rate limits. Its rollback deletes those records and removes account access. Restoring the database backup recovers them.

### Verification

```sh
make fmt lint test
make integration
make build
make audit
(cd apps/web && npx playwright install chromium webkit)
make browser-test playtest-test
```

- `lint` checks Go formatting and vet, frontend formatting, static analysis, strict TypeScript and OpenAPI type drift. After a contract edit run `npm --prefix apps/web run contracts`.
- `test` runs Go race-enabled tests and TypeScript unit tests. `integration` starts an isolated Compose project on a random port, exercises real SQL migrations and API readiness, then removes its test volume.
- `build` writes the API binary to `build/f7-api` and static assets to `apps/web/dist`. To serve the static build with a working connection indicator, route `/api` to the Go API.
- `browser-test` serves the production build on port 4173 and runs Android-sized Chromium, iPhone-sized WebKit and desktop Chromium checks. Set `CHROME_BIN` to an installed Chromium-compatible executable to use it. On Linux, Playwright can install browser dependencies with `npx playwright install --with-deps chromium webkit` from `apps/web`.
- `playtest-test` starts a temporary API and PostgreSQL database, then exercises real email verification, password recovery, cross-browser sign-in, offline reward sync, purchases, reload and backup conflicts on all three browser profiles. It requires free ports 4173 and 18347.
- GitHub Actions runs these checks on pushes and pull requests. Deployment is scheduled for M10.
- `audit` checks the npm lockfile against registry advisories and runs Go's vulnerability scanner against reachable code. It needs network access.

### Project boundaries

| Path | Responsibility |
| --- | --- |
| `apps/web/src/app`, `ui`, `api` | Browser bootstrap, accessible HTML controls, typed HTTP client |
| `apps/web/src/game` | Phaser scene and rendering adapter, independent character asset types and validation |
| `assets/manifests`, `assets/runtime` | Stable character IDs, replaceable asset declarations, distributable art |
| `apps/api/cmd/api`, `internal` | Process lifecycle, configuration, HTTP routing, health service and PostgreSQL adapter |
| `packages/contracts/openapi` | Versioned HTTP contract for the implemented endpoints |
| `infra/docker`, `scripts` | Local PostgreSQL, setup and integration checks |

For artwork replacement, see the [asset pipeline](docs/10-ASSET-AND-AUDIO-PIPELINE.md). Keep personal photos in the ignored character `reference/` folders. The [master index](docs/00-MASTER-INDEX.md) defines source authority and the [roadmap](docs/14-IMPLEMENTATION-ROADMAP.md) defines milestone boundaries. The [M1 map notes](docs/04-LEVEL-AND-MAP-SPECIFICATION.md#m1-map-prototype) document the image trace, the kitchen entrance above the fridge and the balcony crossing. See the [open decisions](docs/16-OPEN-DECISIONS.md).
