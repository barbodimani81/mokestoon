# Instructions for Coding Agents

## Mission

Implement F7 as described by the documentation in `docs/`. Deliver a tested, secure, mobile-first web game and its production deployment configuration. Do not treat this documentation repository as permission to invent missing product decisions.

## Mandatory reading

Read in this order:
1. `docs/00-MASTER-INDEX.md`
2. `docs/01-PRODUCT-REQUIREMENTS.md`
3. `docs/02-GAME-DESIGN.md`
4. `docs/03-CHARACTER-SPECIFICATION.md`
5. `docs/04-LEVEL-AND-MAP-SPECIFICATION.md`
6. `docs/06-TECHNICAL-ARCHITECTURE.md`
7. `docs/07-DATABASE-SCHEMA.md` and `docs/08-API-CONTRACTS.md`
8. `docs/14-IMPLEMENTATION-ROADMAP.md`
9. `docs/17-GAMEPLAY-REVISION-TODO.md` in full. The owner’s 2026-11-20 revision supersedes conflicting interaction, UI, language and reward-flow requirements. Consult `docs/18-ACTIVITY-CATALOG-BRAINSTORM.md` for candidate status.

Consult the remaining documents when implementing their domain.

## Authority and ambiguity

- A requirement marked **Confirmed** is a product-owner decision. Preserve it.
- **Default** is a documented implementation choice made to unblock work. Keep it configurable and record any material deviation.
- **Proposal** is not approved. Do not ship it as a required feature without approval.
- **Open** means information is missing. Do not fabricate it. Implement a safe seam or placeholder only when that does not distort the product; otherwise stop that dependent task and report the exact blocker.
- If two documents conflict, `00-MASTER-INDEX.md` defines precedence. Prefer the more specific domain document only when it does not contradict a confirmed product requirement.

## Non-negotiable product constraints

- One fixed, top-down camera showing the **entire apartment** at once. No scrolling camera and no room-to-room scene transitions.
- One master bedroom, one large hall/living room, kitchen, guest WC, master bathroom and balcony. The exact wall/door geometry is not known yet; never invent it.
- Five real-person-inspired fictionalized game characters: Barbod, Kavian, Mahan, Parsa and Parham. Use approved supplied references and the written character spec. Do not substitute generic designs.
- Character autonomy is semi-autonomous: characters move and perform ambient actions, but the player primarily directs meaningful tasks. Ignored requests can produce comedic consequences.
- Distinguish **Faaz** (spendable currency) from **F7 Score** (non-spendable ranking score). Never permit spending F7 Score.
- Single-player simulation. Accounts and leaderboard are online social features; do not build real-time multiplayer unless explicitly approved.
- Preserve the apartment's recognizable real layout and bright wood theme. Progression unlocks objects, activities and ambiance, not a new floor plan.
- The shared joint event sequence and character-specific behavior are specified in `03-CHARACTER-SPECIFICATION.md` and `09-GAMEPLAY-SYSTEMS.md`. Keep it as an in-game event sequence, not a permanent state.

## Engineering rules

- Use a monorepo: Phaser/TypeScript frontend, Go API, PostgreSQL, shared OpenAPI contract.
- Start as a modular monolith. Do not split services without a measured reason.
- Keep game simulation rules in testable TypeScript modules, not buried in Phaser scene code.
- Use stable IDs for characters, objects, activities, unlocks and reward events. Do not use display names as database keys.
- All currency and score mutations must be represented by server-validated, idempotent ledger events. Never accept a client-supplied final wallet balance or arbitrary score total.
- Store timestamps in UTC; use a configurable display timezone. The apartment/day-cycle clock is simulated game time, not server wall-clock time.
- Validate request bodies, authorization and ownership at the API boundary. Never commit secrets.
- Migrations are versioned and reversible where practical. Schema changes need migration tests.
- Avoid overengineering: no microservices, message broker, Kubernetes, or mandatory Redis for the first release.
- Ensure touch interaction works on current mobile browsers and the game remains usable on desktop.
- Respect reduced-motion preferences where practical and provide mute/volume controls.

## Required workflow

1. Inspect the repository before changing it. Do not overwrite user work.
2. Convert the next roadmap milestone into small tasks with acceptance criteria.
3. Implement one milestone at a time. Keep `main` buildable.
4. Add unit tests for domain logic and integration tests for persistence/API behavior.
5. Run formatters, linters, tests and production builds before marking a task complete.
6. Update relevant docs when implementation decisions change. Record deviations in `docs/16-OPEN-DECISIONS.md` or a decision record.
7. Do not claim deployment succeeded unless a real deployment and health check were performed.
8. Report changed files, commands run, results, limitations and blockers.

## Definition of done for each feature

- Requirements and edge cases are implemented.
- UI has loading, empty, success and error states where relevant.
- Keyboard and touch interactions work where applicable.
- Tests cover normal, boundary and failure cases.
- Persistence and idempotency are correct where relevant.
- No secret, test credential or personal reference image is committed accidentally.
- Documentation and acceptance criteria are updated.
