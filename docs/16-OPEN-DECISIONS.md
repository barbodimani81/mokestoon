# 16 — Open Decisions and Assumptions Register

This document is the single register for missing product-owner decisions. Update the status and date when resolved. A coding agent must not quietly mark an open item as confirmed.

## P0 — Blocks final fidelity or production launch

| ID | Decision/input required | Current status/default | Why it matters |
|---|---|---|---|
| D-001 | Original floor-plan image and confirmation of orientation, dimensions, walls, doors/windows and furniture positions | **Open** — verbal description is recorded in `04-LEVEL-AND-MAP-SPECIFICATION.md`; do not invent exact geometry | Blocks final map and pathfinding anchors |
| D-002 | Master bathroom's exact position and door | **Open** | Required for accurate layout and bathroom interactions |
| D-003 | Confirm whether “second WC” means an upgrade to an existing bathroom, a new fixture, or a different feature | **Open** — do not add another room; apartment facts currently specify guest WC plus master bathroom | Avoids contradicting the real floor plan |
| D-004 | Final production art references/sprite approval for all five friends | **Open** — written appearance/behavior descriptions are available; final assets need approval | Determines art fidelity and release readiness |
| D-005 | Production domain, hosting provider and database hosting | **Open** — provider-agnostic deployment plan | Needed for real deploy and DNS/TLS |
| D-006 | Built-in soundtrack rights and production audio assets | **Open** — use only original/licensed/cleared tracks | Prevents shipping unapproved recordings |

## P1 — Needed to finalize account/social/music behavior

| ID | Decision/input required | Default proposed | Consequence |
|---|---|---|---|
| D-007 | Login method | Email/password + email verification, Argon2id and secure refresh cookie | Requires email delivery provider or replace with OIDC |
| D-008 | Leaderboard scope | Private F7 friend group via invite code, with global leaderboard disabled initially | Requires group membership/invite flow; approve before building it |
| D-009 | Personal playlist behavior | Local device import only; no cloud upload/sync in first release | Imported tracks will not automatically transfer across devices |
| D-010 | Account display-name policy | Unique case-insensitive display name, owner-configurable rename | Affects schema/leaderboard privacy |
| D-011 | Data deletion and account recovery policy | Define before public launch | Required operational/privacy behavior |

## P2 — Tuning/content decisions

| ID | Decision/input required | Current status/default |
|---|---|---|
| D-012 | Faaz costs for each unlock and reward amounts | **Open** — keep catalog configurable; use conspicuously marked development-only values |
| D-013 | Exact progression order and prerequisites | **Open** — implement catalog engine first, do not lock a final balance |
| D-014 | Party intensity/consumption controls and state transitions | **Open** — core game must work without this feature |
| D-015 | Exact timing/choreography of Parsa's handshake-and-kiss greeting | **Open** — use a neutral greeting placeholder until clarified |
| D-016 | Meaning of “mench” in Parham's activity list | **Open** — preserve label; do not guess an activity definition |
| D-017 | Birthday party/endgame with five extra guests | **Proposal** — defer until core five-character simulation is stable |
| D-018 | Whether additional proposed events (neighbor complaints, power outage, etc.) belong in release | **Proposal** — not part of baseline scope |
| D-019 | Food menu and time-of-day availability | **Open** — use a configurable small placeholder menu in development |
| D-020 | Mobile target orientation and minimum supported device/browser matrix | **Open** — support portrait and landscape initially; tune after real map aspect ratio is known |

## Engineering defaults (not owner decisions)

- Phaser 3 + TypeScript, Vite and PWA support.
- Go modular monolith, PostgreSQL, REST/JSON and OpenAPI.
- One repo, one deployable API service and static web frontend.
- Local-first simulation with server-confirmed wallet/score ledgers.
- Fixed-step simulation loop, default 10 ticks/second.
- No Redis, Kubernetes, NATS, microservices or live multiplayer in the first release.
- Local personal audio import, no server upload in first release.

## Decision log

### M0 engineering defaults, 2026-11-19

- The local web package uses npm with a committed lockfile. The API uses the Go standard HTTP router and pgx. These choices implement the documented modules without a production provider dependency.
- Local PostgreSQL uses a loopback port and a generated password. The API, Compose and migration CLI share the same PostgreSQL environment settings. The first versioned migration creates an empty `f7` namespace. Account and ledger tables are scheduled for their respective milestones.
- Responsive asset preview dimensions are independent of the future map resolution. Named letter tiles identify missing art. Camera scale, geometry, sprite approvals and music rights retain their open status.

When resolving an item, append:

```text
Date: YYYY-MM-DD
Decision ID: D-xxx
Decision: <chosen outcome>
Owner confirmation: <how/where confirmed>
Documents updated: <list>
Implementation impact: <summary>
```

Do not delete prior decisions; supersede them with a dated entry.
