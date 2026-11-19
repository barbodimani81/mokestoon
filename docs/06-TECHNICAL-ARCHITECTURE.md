# 06 — Technical Architecture

## 1. Architecture overview

Use a single repository with three primary components:

- `apps/web`: Phaser 3 + TypeScript browser game; Vite build; PWA shell.
- `apps/api`: Go modular monolith exposing versioned HTTP/JSON endpoints.
- `packages/contracts`: OpenAPI specification and generated/shared API types.

PostgreSQL is the system of record for accounts, player profile, cloud save metadata, unlocks, wallet ledger, score ledger and leaderboard membership. The browser runs the simulation locally. No real-time multiplayer server is required.

## 2. Runtime boundaries

### Browser/game client owns
- Rendering, input, camera framing and animation playback.
- Real-time local character movement and AI decisions.
- Local simulation clock, request generation and event presentation.
- Local imported audio selection and playback (initial default).
- Local pending-event queue while offline.

### API/server owns
- Authentication and session lifecycle.
- Player profile and account authorization.
- Canonical progression/unlock records.
- Faaz and F7 Score ledgers and validation.
- Cloud save snapshots/versioning.
- Leaderboard queries and friend-group membership.
- Authoritative validation of purchases and reward claims.

The client may predict rewards for responsiveness, but must visually mark them pending until accepted by the server.

## 3. Frontend structure

Suggested modules:

```text
apps/web/src/
  app/                 # bootstrap, routing, service registration
  game/
    config/             # tuning, feature flags, content catalog
    scenes/             # boot, preload, apartment scene
    entities/           # character and object models
    systems/            # movement, pathfinding, requests, AI, time, economy
    events/             # event definitions and sequencer
    map/                # Tiled loading, layers, coordinates, collision
    audio/              # track selection, vibe profiles, audio import
    rendering/          # effects, lighting, animation adapters
  ui/                   # HUD, menus, panels, account and leaderboard
  api/                  # typed API client and auth/session handling
  persistence/          # IndexedDB/local save and sync queue
  assets/               # imported/generated metadata only; source art kept separately
  shared/               # IDs, types, validation helpers
```

Keep simulation/domain rules independent of Phaser where possible. A Phaser scene should orchestrate systems, not contain all business logic.

## 4. Backend structure

Suggested Go modular monolith:

```text
apps/api/
  cmd/api/               # server entry point
  internal/
    config/
    http/                 # routing, middleware, request/response mapping
    auth/
    players/
    groups/
    saves/
    economy/              # Faaz ledger and purchases
    scoring/              # F7 Score ledger and validation
    leaderboard/
    catalog/              # unlocks, rewards and game config
    health/
    platform/             # database, clock, IDs, logging
  migrations/
  tests/
```

Use interfaces at external boundaries (database, clock, mail sender if used, object store), not for every internal function. Avoid premature microservices.

## 5. API and contract approach

- REST over HTTPS with JSON.
- Version prefix `/api/v1`.
- OpenAPI is the source of truth for request/response schemas.
- Generate or validate client types from the OpenAPI document.
- Use UUIDs for entity/event IDs.
- Use RFC 3339 UTC timestamps for server timestamps.
- Use pagination for leaderboard and event history.
- Use idempotency keys for purchases and event synchronization.

See `08-API-CONTRACTS.md` for endpoints and semantics.

## 6. Persistence model

PostgreSQL stores canonical player and economy records. The client stores a local snapshot and an append-only pending event queue in IndexedDB. Server save versions prevent stale overwrite. See `07-DATABASE-SCHEMA.md`.

Do not store music file bytes in PostgreSQL. Initial local import stores a reference/metadata in IndexedDB and plays from browser-local file storage where supported. If owner later approves cloud music, use private object storage with quotas and explicit access control.

## 7. Game simulation timing

- Use Phaser's frame loop for rendering.
- Use a fixed-step simulation update for character state, request timers and game-time progression (default 10 updates/second, configurable).
- Rendering interpolates between simulation states as needed.
- Pause simulation while the app is intentionally paused or backgrounded according to a documented policy.
- Avoid tying reward calculation to raw frame counts.
- Use seeded randomness for reproducible unit tests.

## 8. Offline and synchronization

- Cache the application shell and essential assets via the service worker.
- Persist local game state and pending events in IndexedDB.
- Queue event records with unique IDs and sequence numbers.
- On reconnect, send batches to the API; server processes each idempotently and returns accepted/rejected outcomes.
- Cloud save updates use optimistic concurrency (`expected_version`).
- A conflict must be surfaced and reconciled; do not silently overwrite cloud data.
- Leaderboard and confirmed balances require a network connection.

## 9. Environments

- `local`: Docker Compose PostgreSQL; optional local mail/object storage fakes.
- `test`: isolated database/schema; deterministic clock/seeded random.
- `staging`: production-like deployment with test accounts and non-production data.
- `production`: HTTPS, managed secrets, backups and monitoring.

Never copy production data into local/test environments by default.

## 10. Observability

- Structured JSON logs with request ID and user ID where appropriate; avoid passwords/tokens/personal data.
- Health endpoints: liveness and readiness.
- Metrics: request count/latency/error rate, DB pool, auth failures, event sync accepted/rejected, save conflicts and leaderboard query latency.
- Frontend error reporting should scrub tokens and user-generated audio metadata.

## 11. Explicitly excluded infrastructure

No mandatory Kubernetes, Redis, NATS, event broker, service mesh or separate leaderboard service for first release. Add only after load or operational evidence justifies it.
