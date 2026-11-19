# F7 — Game Project

F7 is a single-player, top-down apartment-life simulation set inside the real 55 m² apartment shared by five friends. The player coordinates requests and activities while the characters act semi-autonomously. The tone is chaotic, personal, social and comedic.

## Project status

This repository is a **documentation-first implementation starter**, not a completed game. It defines the product, technical contracts, implementation order, quality gates and deployment target. The exact floor-plan geometry and final character/audio assets are still required before visual production can be considered complete.

## Documentation entry points

1. Read [`AGENTS.md`](AGENTS.md) before editing anything.
2. Read [`docs/00-MASTER-INDEX.md`](docs/00-MASTER-INDEX.md) for authority, status labels and dependencies.
3. Read [`docs/01-PRODUCT-REQUIREMENTS.md`](docs/01-PRODUCT-REQUIREMENTS.md) and [`docs/02-GAME-DESIGN.md`](docs/02-GAME-DESIGN.md).
4. Implement in the order defined by [`docs/14-IMPLEMENTATION-ROADMAP.md`](docs/14-IMPLEMENTATION-ROADMAP.md).
5. Do not guess missing apartment geometry. Track it in [`docs/16-OPEN-DECISIONS.md`](docs/16-OPEN-DECISIONS.md).

## Target architecture

- Web client: Phaser 3 + TypeScript, built with Vite, installable as a PWA.
- API: Go modular monolith using HTTP/JSON and OpenAPI contracts.
- Database: PostgreSQL.
- Optional object storage: S3-compatible storage for production-managed assets only. User-imported music is local to the browser in the first release unless the product owner changes that decision.
- Deployment: containerized web/API services behind HTTPS reverse proxy; provider-agnostic.

## Local development (target commands)

These commands become valid once the agent has created the application manifests and services:

```bash
# Start local dependencies (PostgreSQL and optional object storage)
docker compose -f infra/docker/compose.dev.yml up -d

# Start API
cd apps/api && go run ./cmd/api

# Start web client
cd apps/web && pnpm install && pnpm dev
```

The documentation package deliberately does not fabricate executable app manifests, credentials, a map, or art assets. The implementation agent must add those during the relevant roadmap milestones.

## Definition of a release candidate

A release candidate is not merely a successful local build. It must pass the acceptance criteria in `docs/12-TESTING-AND-ACCEPTANCE.md`, use the production configuration in `docs/13-DEPLOYMENT-AND-OPERATIONS.md`, and have no unresolved P0/P1 issues. See `docs/16-OPEN-DECISIONS.md` for required owner inputs.
