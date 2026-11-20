# 12 — Testing and Acceptance Criteria

## 1. Testing layers

- Unit tests: simulation rules, request lifecycle, patience, reward mapping, state transitions, unlock prerequisites, music override restoration.
- Component tests: HUD and contextual panels, request indicators, offline status and audio controls.
- Integration tests: API + PostgreSQL transactions, auth/session rotation, save versioning, purchases, event synchronization and leaderboard scope.
- End-to-end tests: sign up, play, complete request, receive rewards, buy unlock, save, sign in on another browser and see restored state.
- Device tests: real mobile browsers, touch, safe areas, audio autoplay restrictions and PWA installation.
- Performance tests: map/atlas load, frame stability, memory and API response latency.

## 2. Core gameplay acceptance

### Map
- Entire apartment is visible at once on tested mobile and desktop viewports.
- No camera scrolling is needed to reach any room.
- All wall/door/room geometry matches the owner-approved source plan.
- Collision prevents walking through walls and furniture.
- All required spaces are connected according to the real plan.

### Characters
- All five have distinct sprites, names and signature behavior.
- Characters can navigate to reachable objects and recover from blocked paths.
- Ambient behavior does not cancel player-directed tasks unexpectedly.
- Shared happy tongue-out gesture and shared elbow-swing dance exist for all.
- Kavian has cleaning/dishwashing and equipment setup behaviors.
- Mahan's high-energy jumping is state-dependent.
- Parham's belly-laugh/hands-up reaction is represented.
- Savage mode is temporary and resets correctly.

### Requests and activities
- Requests show target, urgency and expiry feedback.
- Complete/expired/cancelled requests resolve once only.
- Invalid actions explain why they cannot start.
- Ignored requests cause configured consequences without soft-locking the game.
- Character can complete at least one full activity path: select → navigate → perform → resolve.

### Economy/progression
- Faaz and F7 Score are visibly distinct.
- Faaz can be spent on an enabled unlock; F7 Score cannot be spent.
- A repeated purchase request does not charge twice.
- A rejected purchase does not mutate wallet/unlocks.
- Prices/rewards are read from configuration/catalog.

### Music and events
- Vibe changes lighting/behavior as configured.
- Music can be muted and volume adjusted.
- Event override restores the previously selected track.
- Joint event follows the defined sequence and releases all participants on completion/cancellation.
- Foonfoonak accepts timely taps and resolves consistently with its timer.

## 3. Account and backend acceptance

- Registration/login/logout works with secure session behavior.
- Authenticated users cannot read or overwrite another user's save.
- Refresh session rotation/revocation is tested.
- Save version mismatch returns conflict and does not overwrite newer data.
- Event retry is idempotent.
- Client cannot set arbitrary Faaz or F7 Score.
- Leaderboard uses F7 Score, paginates and does not expose email/private fields.
- Database migration succeeds from an empty database.

## 4. Offline acceptance

- Once loaded, the game can continue basic local play offline.
- Pending rewards are visibly pending, not confirmed.
- Reconnection syncs accepted events once; repeated sync does not duplicate rewards.
- A save conflict is handled without silently discarding newer cloud state.
- Leaderboard explains that a connection is required when offline.

## 5. Performance and stability targets

Initial targets (validate on target devices; tune if measurement says otherwise):
- Aim for 60 FPS on recent mid-range phones; gracefully degrade effects on slower devices.
- No persistent memory growth during a 30-minute session.
- No uncaught errors during a 30-minute scripted gameplay test.
- Avoid loading optional full-length music files before the player requests them.
- API p95 latency target under 300 ms for common reads under expected friend-group load, excluding external email delivery.

## 6. Production release gate

A release candidate must have:
- All P0/P1 defects closed.
- Required core acceptance criteria passed.
- Production build and container image reproducibly generated.
- Database migrations applied and backup/restore tested.
- HTTPS, CORS, cookies, secrets and rate limits verified.
- Health/readiness checks passing.
- Error monitoring/logging enabled without secret leakage.
- Rollback procedure documented and tested at least once in staging.
- Final open decisions that affect release resolved or explicitly waived by owner.

## 7. Test data

Use synthetic test accounts and deterministic fixtures. Never use actual passwords or private personal data in tests. Keep test audio and images licensed/original or generated for the project.

## Gameplay revision acceptance

Use a fresh browser context. Verify a bubble above Parsa, single eligible station, native popup, actual walk and preparation, carry, cooling across reload, fridge readiness and a separately commanded eating stage. Verify Mahan’s distinct cigarette/IQOS options, arrival, animation and single terminal receipt. Close with Back/Escape, cancel and try an invalid station. Check RTL, font loading, fixed camera after rotation, visible and selectable bodies and adequate contrast. Verify local storage, server backup conflicts, real email sign-in, leaderboard states, sound without a music file, offline reward replay, locked/insufficient purchases, explicit purchase confirmation and retained ownership. Compare checks and limitations in reviews/gameplay-revision-audit.md.
