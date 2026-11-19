# 14 — Implementation Roadmap

## Delivery rule

Work sequentially through milestones. Do not start polishing final art or building complex events before the map, movement and core interaction loop work. Every milestone ends with a runnable build and acceptance evidence.

## M0 — Repository and engineering foundation

**Deliverables:** monorepo layout, frontend build, Go API skeleton, PostgreSQL Compose service, migrations framework, OpenAPI skeleton, lint/test commands, CI baseline, environment examples.

**Acceptance:** clean clone can install dependencies, start local DB, run API/web, execute tests and build production assets. No secrets committed.

## M1 — Apartment map prototype

**Dependencies:** confirmed floor-plan drawing and key spatial facts.

**Deliverables:** Tiled map, full-apartment fixed camera, floor/wall/collision layers, semantic anchors, responsive viewport fit.

**Acceptance:** entire apartment visible; geometry matches owner-approved plan; all target rooms connected; no invented architecture.

## M2 — Character rendering and movement

**Deliverables:** five character entity models, placeholder art if final art unavailable, movement, pathfinding, collision, selection and idle/walk animations.

**Acceptance:** all five can move through valid paths, stop at anchors and recover from blocked routes; character scale/proportions consistent.

## M3 — Core interaction and request loop

**Deliverables:** character/object contextual menus, activity intents, request lifecycle, patience, state feedback and temporary savage reactions.

**Acceptance:** full request cycle works; ignored request produces a visible consequence; no permanent lockout; ambient AI does not disrupt player actions.

## M4 — Basic activities and apartment simulation

**Deliverables:** food/fridge, socializing, TV placeholder, balcony interaction, cleaning/dishes, rest/sleep, day/night.

**Acceptance:** one complete play session is coherent even with placeholder art/audio. Kavian cleaning preference and individual friend behaviors function.

## M5 — Economy and progression

**Deliverables:** Faaz rewards/purchases, separate F7 Score, configurable unlock catalog and local persistence.

**Acceptance:** purchase prerequisites and costs work; score is non-spendable; local restart preserves progression; catalog can be tuned without changing core logic.

## M6 — Backend identity and cloud persistence

**Deliverables:** auth, profile, PostgreSQL migrations, save versioning, unlock persistence, ledgers and event sync.

**Acceptance:** user can sign in across browsers; canonical wallet/score restored; retries idempotent; authorization and conflict tests pass.

## M7 — Leaderboard

**Deliverables:** paginated leaderboard using F7 Score; group scope only after privacy/invite decision.

**Acceptance:** rankings are correct, stable, authorized and do not expose private user data. Faaz is never used for ranking.

## M8 — Music, signature animations and events

**Deliverables:** vibe profiles, audio selection/import, event overrides, shared dance, sunglasses sequence, jump/hug event, signature reactions and first mini-events.

**Acceptance:** track/vibe separation works; music override restores correctly; sequence cleans up on completion and cancellation; audio permissions handled.

## M9 — PWA, mobile quality and content polish

**Deliverables:** PWA manifest/service worker, cache versioning, optimized assets, touch UX, reduced motion/audio controls, tutorial and error states.

**Acceptance:** installable and usable on target mobile browsers; map fits; offline basic play and sync recovery work.

## M10 — Production readiness and launch

**Deliverables:** production containers/hosting, TLS, domain, migrations, backups, monitoring, CI/CD, rollback and owner handover.

**Acceptance:** all release gates in `12-TESTING-AND-ACCEPTANCE.md` pass; staging rollback tested; production health check verified.

## Parallel work rules

Safe parallel work after M0:
- Backend auth/database scaffolding can proceed alongside frontend shell.
- Character art can proceed alongside map implementation if camera/style constraints are documented.
- UI panels can be prototyped against mocked typed API contracts.

Do not parallelize conflicting edits to the same API contract, database schema or map coordinates. Assign one owner/agent for each source of truth and integrate through reviewed changes.

## Prioritization

P0: map fidelity, core character movement, interaction/request loop, persistence correctness, account security.
P1: progression, leaderboard, music/vibe, signature group event, essential mini-games.
P2: extra ambient events, expanded catalogs, advanced party intensity, birthday endgame, cosmetics.

Do not label a feature production-ready until the relevant acceptance tests pass.
