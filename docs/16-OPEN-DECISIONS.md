# 16 — Open Decisions and Assumptions Register

This document is the single register for missing product-owner decisions. Update the status and date when resolved. A coding agent must not quietly mark an open item as confirmed.

## P0 — Blocks final fidelity or production launch

| ID | Decision/input required | Current status/default | Why it matters |
|---|---|---|---|
| D-001 | Original floor-plan image and confirmation of orientation, dimensions, walls, doors/windows and furniture positions | **Partial** — plan supplied and traced. The kitchen opens on the right above the fridge, next to the hall-facing counter. The owner accepted the balcony as drawn. The prototype uses the traced sill. Physical scale is unmeasured. | Blocks final map and pathfinding anchors |
| D-002 | Master bathroom's exact position and door | **Located in supplied map** — upper right, entered through the bedroom's upper wall | Required for accurate layout and bathroom interactions |
| D-003 | Confirm whether “second WC” means an upgrade to an existing bathroom, a new fixture, or a different feature | **Open** — do not add another room; apartment facts currently specify guest WC plus master bathroom | Avoids contradicting the real floor plan |
| D-004 | Final production art references/sprite approval for all five friends | **Open** — five pixel references are supplied, and the temporary game sprites follow them and the written outfits. Final sprite approval is pending. | Determines art fidelity and release readiness |
| D-005 | Production domain, hosting provider and database hosting | **Open** — provider-agnostic deployment plan | Needed for real deploy and DNS/TLS |
| D-006 | Built-in soundtrack rights and production audio assets | **Partial** — the apartment includes the original F7 loop *Hall Lights* and synthesized alerts. Additional production tracks still require clearance. | Prevents shipping unapproved recordings |

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

### M7 ranking rules, 2026-11-20

The local implementation calculates all-time F7 Score over an explicitly authorized roster. Equal scores share rank and a private stable account key orders ties. The account panel supports paging, refreshing and offline feedback. D-008 remains open. The running server denies cross-account reads until a visibility policy is approved.

### M6 local accounts, 2026-11-20

D-007 and D-010 remain open for launch. The opt-in loopback playtest exercises the documented email/password default with a local SMTP inbox. Profiles use a private, optional name with case-insensitive uniqueness for this playtest. Verification in the originating guest browser keeps its player ID and progression. The dedicated account session store and game data are independent of the email credential table. D-008 still requires a privacy and invitation decision before leaderboard work.

### M6 save versioning, 2026-11-19

The local playtest uses manual PostgreSQL backups with optimistic version checks. The player may keep their device state after a conflict or explicitly restore the stored checkpoint. Real account sign-in and display-name policy depend on D-007 and D-010.

### M5 development economy, 2026-11-19

D-007, D-012 and D-013 remain open. The loopback-only playtest uses a browser session and an explicitly labeled catalog. Its reward is 5 Faaz and 3 F7 Score per eligible request. The TV costs 10 Faaz. The PS4 costs 15 and requires the TV. These values and prerequisites are development fixtures. Release accounts, pricing and rankings need owner decisions.

### M1 map source, 2026-11-19

The owner supplied the repository floor-plan image and instructed work to continue. The prototype uses the drawn room positions, including the guest WC on the right side of the entrance. No drawing scale or missing door geometry was supplied. Exact clearance, furniture interaction points and production collision footprints remain subject to review.

The owner subsequently confirmed that the kitchen opens on its right and that its counter faces the hall. The map now records the entrance side and uses the existing trace facing the living room for the counter. When asked which end of the fridge to use, the owner confirmed the upper end. The prototype connects the kitchen to the entrance hall through the gap above the fridge. Its span follows the image trace.

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

## Owner revision and outstanding decisions · 2026-11-20

**CONFIRMED** under revision 17: friend → station → popup, the two named journeys, above-head requests, Persian-first RTL UI and separate Faaz purchase confirmation.

**IMPLEMENTATION DEFAULT:** seven station badge locations use existing furniture. Jelly cools for 55 simulation ticks. Both smoking options take 36 ticks. Jelly pays at the terminal eating stage only. Local catalog values remain 5 Faaz and 3 F7 Score per eligible request, 10 Faaz for TV and 15 Faaz for PS4 after TV. D-012/D-013 remain open.

**D-019 — OPEN, owner decision required:** choose the next activities in revision 18 and approve triggers, timing and unlocks for liked mini-events. Confirm guest WC queue ordering, master bathroom access, food/drink menu and release prerequisites for the group event. D-004, D-006, D-009 and D-014–016 still apply. Review fridge inspection, a shared TV/phone moment and the guest-WC queue first. No additional prices or copyrighted recordings are approved by this register.
