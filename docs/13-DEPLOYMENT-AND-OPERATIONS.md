# 13 — Deployment and Operations

## 1. Deployment shape

Provider-agnostic first-release deployment:
- Static web build served over HTTPS (CDN/static host or web container).
- Go API container behind HTTPS reverse proxy.
- Managed PostgreSQL or a private database container for a small controlled deployment.
- Optional private S3-compatible object storage only if cloud assets/uploads are approved.
- DNS and TLS configured for the production domain.

Do not deploy PostgreSQL directly to the public internet. Do not introduce Kubernetes for the first release without an explicit operational requirement.

## 2. Environments

- Local: Docker Compose, local database and test configuration.
- Staging: production-like settings and separate database/storage.
- Production: isolated secrets, HTTPS, backups, monitoring and access controls.

Never share credentials or databases across staging and production.

## 3. Required configuration

Create `.env.example` with names and safe placeholders only. Expected variables include:

```dotenv
APP_ENV=local
HTTP_ADDR=:8080
PUBLIC_WEB_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://f7:f7@localhost:5432/f7?sslmode=disable
SESSION_COOKIE_NAME=f7_session
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
ACCESS_TOKEN_TTL=15m
REFRESH_SESSION_TTL=720h
LOG_LEVEL=debug
```

Production must use injected secrets and secure cookies. Database credentials above are local-only examples and must never be copied to production.

## 4. Container and local development

Provide a Docker Compose file for PostgreSQL and API dependencies. Keep web development server local for fast iteration. Include health checks and named volumes. The database should bind to localhost in development when possible.

Recommended Make targets:
- `make dev-deps`
- `make test`
- `make lint`
- `make build`
- `make migrate-up`
- `make migrate-down`
- `make api-run`
- `make web-dev`
- `make compose-down`

Targets must accurately reflect actual scripts; do not leave placeholder commands claiming success.

## 5. Build/release pipeline

CI should:
1. Run formatters and static checks.
2. Run frontend unit/type tests and production build.
3. Run Go formatting, vet/lint and unit tests.
4. Start an isolated PostgreSQL service and run integration/migration tests.
5. Validate OpenAPI and generated client compatibility.
6. Build versioned container/image artifacts.
7. Deploy to staging on approved branch/tag.
8. Run smoke tests.
9. Require explicit promotion to production.

Do not place production secrets in CI logs or repository variables with excessive access.

## 6. Database operations

- Run migrations as a controlled release step, not independently from every API replica.
- Take automated backups and retain according to an owner-approved policy.
- Test restoration into a separate environment.
- Monitor connection pool saturation, slow queries, disk usage and migration failures.
- Use least-privilege DB roles.

## 7. Observability and alerts

At minimum monitor:
- API availability, p95 latency and 5xx rate.
- DB availability, connections, CPU, disk and backup freshness.
- Authentication and sync error rates.
- Event acceptance/rejection ratios.
- Save conflict and purchase failure rates.
- Frontend crash rate and asset load failures.

Keep alerts actionable; do not create noisy alerts for ordinary user behavior.

## 8. Rollback

- Keep previous web build and API image available.
- Prefer backward-compatible database migrations (expand, deploy, migrate data, contract later).
- Do not roll back a schema destructively when data has been written to it.
- Document how to switch traffic to the previous web/API release.
- Verify the previous API remains compatible with the current database schema before using it.

## 9. Launch checklist

- Domain/DNS and HTTPS verified.
- Production CORS and cookie settings verified.
- Secrets injected from secure configuration.
- Database backups and restore tested.
- Migrations applied.
- Health endpoints and monitoring active.
- PWA manifest/service worker and cache invalidation tested.
- Mobile load/performance and audio restrictions tested.
- Account deletion/contact/support route defined.
- Owner-approved art/music rights and privacy policy resolved.
