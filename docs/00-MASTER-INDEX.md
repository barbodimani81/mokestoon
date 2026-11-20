# 00 — Master Index and Source of Truth

## Purpose

This index defines how to read and maintain the F7 implementation specification. It is the controlling reference when documents overlap.

## Status vocabulary

- **Confirmed** — explicitly decided by the product owner.
- **Default** — a practical engineering/product default proposed here to unblock implementation. Keep it configurable; ask before making it irreversible.
- **Proposal** — an idea that has been discussed but is not an approved release requirement.
- **Open** — missing information that must be supplied or explicitly decided.
- **Out of scope** — intentionally excluded from the first release.

## Document map

| File | Authority / purpose |
|---|---|
| `01-PRODUCT-REQUIREMENTS.md` | Product scope, target experience, functional/non-functional requirements |
| `02-GAME-DESIGN.md` | Core loop, pacing, activity and progression design |
| `03-CHARACTER-SPECIFICATION.md` | Canonical character traits and signature behavior |
| `04-LEVEL-AND-MAP-SPECIFICATION.md` | Apartment topology, map authoring, collision and navigation rules |
| `05-UI-UX-SPECIFICATION.md` | HUD, touch interaction, menus and responsive behavior |
| `06-TECHNICAL-ARCHITECTURE.md` | Systems, boundaries, runtime and infrastructure architecture |
| `07-DATABASE-SCHEMA.md` | Persistent data entities and invariants |
| `08-API-CONTRACTS.md` | HTTP API, authentication, request/response contracts |
| `09-GAMEPLAY-SYSTEMS.md` | Simulation, AI, events, economy and save synchronization |
| `10-ASSET-AND-AUDIO-PIPELINE.md` | Art/audio formats, naming, import and asset QA |
| `11-SECURITY-AND-ANTI-CHEAT.md` | Security and score integrity |
| `12-TESTING-AND-ACCEPTANCE.md` | Quality strategy and release gates |
| `13-DEPLOYMENT-AND-OPERATIONS.md` | Environments, containers, deployment, backups and monitoring |
| `14-IMPLEMENTATION-ROADMAP.md` | Dependency-ordered delivery milestones |
| `15-AGENT-INSTRUCTIONS.md` | Execution protocol for autonomous coding agents |
| `16-OPEN-DECISIONS.md` | Missing owner decisions and assumptions |
| `17-GAMEPLAY-REVISION-TODO.md` | Confirmed owner revision of 2026-11-20. Governs station interactions, Persian UI, character visibility and the Faaz loop. |
| `18-ACTIVITY-CATALOG-BRAINSTORM.md` | Per-station candidate status, prerequisites, effort and owner review. |
| `reviews/gameplay-revision-audit.md` | Observed baseline, verification evidence and remaining gaps. |

## Precedence

1. Explicit product-owner corrections and confirmed requirements. Revision 17 supersedes older conflicting interaction and UI specifications. Catalog brainstorms retain their individual approval status.
2. This master index for document precedence and status semantics.
3. Domain-specific specification for its own subject, provided it does not contradict a confirmed decision.
4. Engineering defaults in architecture/API/database docs.
5. Agent preference only where no requirement or default exists.

If a newer product-owner decision changes an earlier one, update every affected document in the same change. Do not leave contradictory copies.

## Confirmed product baseline

- Single-player apartment-life / time-management / social simulation.
- The game is set in apartment F7, approximately 55 m², shared by five male friends.
- Fixed, top-down view; entire apartment remains visible at once.
- Characters are semi-autonomous: they move themselves and carry out ambient behavior, but the player gives meaningful directions. Ignored requests cause comedic consequences.
- Five characters: Barbod, Kavian, Mahan, Parsa and Parham.
- The apartment has one master bedroom, a large hall/living room, kitchen, guest WC, master bathroom and balcony.
- Preserve the actual apartment layout; do not invent rooms or remodel its topology.
- Bright wood visual theme; detailed 16-bit pixel-art direction.
- Faaz is spendable. F7 Score is non-spendable.
- Accounts and leaderboard are required. Live multiplayer is not.
- Music changes atmosphere and behavior; the owner wants a personal playlist/import feature.
- The shared joint ritual includes sunglasses, techno music, the shared elbow-swing dance, jumping and hugging.
- Kavian is the most likely to clean and wash dishes; others can help.

## Known but not fully specified

- Exact physical scale and final artwork for the traced apartment. The supplied plan locates the master bathroom, and the owner confirmed the balcony and kitchen entrance.
- Exact art assets, animation sheets and final character portraits.
- Exact economy prices, reward quantities and progression pacing.
- Exact login provider and production deployment provider/domain.
- Whether friend rankings are private-group-only or also global.
- Music import persistence/sync model and the final built-in soundtrack licensing.
- Final details of the birthday party/endgame and whether proposed events beyond the explicitly liked set are included.

## Technical direction

The first release uses a Phaser 3 + TypeScript client, Go API, PostgreSQL and an OpenAPI contract. Build a modular monolith. Do not add Kubernetes, Redis, NATS, microservices or other infrastructure without demonstrated need. Vite is the default frontend build tool; PWA support is required. Exact dependency versions are to be pinned and audited when the implementation is initialized.

## Release principle

A feature is not complete because it works once in the developer's browser. It must satisfy the acceptance criteria, behave correctly on touch devices, persist the right state, handle errors, and be deployable from documented configuration. See `12-TESTING-AND-ACCEPTANCE.md` and `13-DEPLOYMENT-AND-OPERATIONS.md`.
