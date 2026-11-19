# F7

F7 is a mobile-first, single-player apartment-life simulation about Barbod, Kavian, Mahan, Parsa and Parham. The design calls for a fixed top-down view of their real apartment. The player directs meaningful tasks while the friends act semi-autonomously. Faaz pays for unlocks. F7 Score ranks players.

## Run M0 locally

The current build is an engineering foundation. The web page boots Phaser, previews the character asset manifest and checks the API connection. Each friend currently has a labeled temporary letter tile. The preview works with the API offline and with no music files.

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

Open http://127.0.0.1:5173. Select a friend with touch, mouse or keyboard. **Check connection** queries PostgreSQL through the API. Vite proxies `/api` on the same origin. To check the API directly:

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

### Database migrations

The versioned SQL pairs live in `apps/api/migrations`. Run `make migrate-up` to apply pending versions. `make migrate-down` rolls back **one version** on the configured local database. The M0 migration creates the empty `f7` namespace. Its rollback refuses to remove a populated schema. Migration history lives in `public.schema_migrations`. Apply migrations separately from API startup. Future migrations can create schema-qualified tables in `f7`.

### Verification

```sh
make fmt lint test
make integration
make build
make audit
(cd apps/web && npx playwright install chromium)
make browser-test
```

- `lint` checks Go formatting and vet, frontend formatting, static analysis, strict TypeScript and OpenAPI type drift. After a contract edit run `npm --prefix apps/web run contracts`.
- `test` runs Go race-enabled tests and TypeScript unit tests. `integration` starts an isolated Compose project on a random port, exercises real SQL migrations and API readiness, then removes its test volume.
- `build` writes the API binary to `build/f7-api` and static assets to `apps/web/dist`. To serve the static build with a working connection indicator, route `/api` to the Go API.
- `browser-test` serves the production build on port 4173 and runs phone-sized touch and desktop keyboard checks. Set `CHROME_BIN` to an installed Chromium-compatible executable to use it. On Linux, Playwright can install browser dependencies with `npx playwright install --with-deps chromium` from `apps/web`.
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

For artwork replacement, see the [asset pipeline](docs/10-ASSET-AND-AUDIO-PIPELINE.md). Keep personal photos in the ignored character `reference/` folders. The [master index](docs/00-MASTER-INDEX.md) defines source authority and the [roadmap](docs/14-IMPLEMENTATION-ROADMAP.md) defines milestone boundaries. M1 requires the owner-confirmed plan, including orientation, scale and master-bathroom access. See the [open decisions](docs/16-OPEN-DECISIONS.md).
