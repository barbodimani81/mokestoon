# 11 — Security and Anti-Cheat

## 1. Threat model

The game is a casual friend-group simulation, not a high-stakes competitive service. Protect accounts, private saves, wallet balances, leaderboard integrity and uploaded content from common abuse. Do not claim the client simulation is tamper-proof.

## 2. Authentication/session security

- Hash passwords with Argon2id if password auth is used.
- Use short-lived access credentials and rotating refresh sessions.
- Store only refresh-token hashes server-side.
- Set production cookies `HttpOnly`, `Secure`, and appropriate `SameSite`.
- Add CSRF protection for cookie-authenticated state-changing endpoints.
- Rate-limit registration, login, password reset and verification.
- Return generic responses for account recovery to prevent email enumeration.
- Revoke sessions on logout/password reset and provide a path to revoke other sessions.

## 3. Authorization

- Derive user identity from the authenticated session, never from a client-supplied `user_id`.
- Every save, unlock, purchase, transaction and private group query must be scoped to the authenticated user and authorized membership.
- Apply allowlists to profile fields; do not permit mass assignment of roles, balances or verification status.
- Protect internal metrics/admin endpoints from public access.

## 4. Economy integrity

- No endpoint may set an arbitrary wallet or score total.
- Purchases are validated and committed atomically.
- Use per-user idempotency keys to prevent duplicate charges/rewards.
- Server selects reward amounts from a configured allowlist; client payload cannot specify amount.
- Apply cooldowns, per-event caps and daily/round limits to prevent simple replay/farming.
- Make event receipt processing transactional.
- Provide an auditable reversal/admin adjustment event; never delete ledger history to fix a balance.

## 5. Score validation limitations

The client simulates gameplay. A modified client can fabricate plausible events. For the first release:
- validate allowed event types and payload shape;
- validate event order, request/event existence where server has a record, time bounds, cooldowns and max achievable reward rates;
- reject duplicate event UUIDs and impossible event sequences;
- rate-limit sync and flag suspicious rates;
- keep a clear distinction between casual leaderboard integrity and robust authoritative simulation.

If the owner later wants serious competitive integrity, move more simulation state and event validation server-side. Do not claim this initial design prevents all cheating.

## 6. Input and API validation

- Strictly validate JSON fields, types, lengths and ranges.
- Bound batch size, save payload size, display-name length and pagination parameters.
- Use parameterized SQL.
- Set request body limits and timeouts.
- Avoid exposing internal error details.

## 7. Infrastructure security

- Secrets only in deployment secret manager/environment injection, never repository.
- TLS for all production traffic.
- Database not publicly exposed; restrict network ingress.
- Use least-privilege database user.
- Apply OS/container updates and dependency vulnerability checks.
- Backups encrypted and restore-tested.
- Restrict CORS to actual production/staging origins.

## 8. User-generated audio

Initial default is local-only import. If server upload is enabled later:
- allowlist formats and inspect actual content, not only filename/MIME header;
- cap file size and user quota;
- store privately outside executable/static web roots;
- use random storage keys and signed URLs;
- scan/validate uploads and support deletion;
- do not distribute user uploads to other players without an explicit sharing policy.

## 9. Privacy

Collect minimal profile data. Do not expose email addresses in leaderboard responses. Keep logs free of tokens/passwords. Define account deletion and retention policy before public launch. Do not commit the friends' reference photographs or personal data unless explicitly approved for public distribution.
