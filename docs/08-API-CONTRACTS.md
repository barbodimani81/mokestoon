# 08 — API Contracts

## 1. Conventions

- Base path: `/api/v1`.
- HTTPS in staging/production.
- JSON request/response bodies.
- UUID identifiers.
- RFC 3339 UTC timestamps.
- Standard error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "request_id": "uuid",
    "details": []
  }
}
```

Do not expose internal stack traces or database messages to clients.

## 2. Authentication

Recommended default: email + password with Argon2id password hashing, email verification and secure refresh sessions. Access tokens should be short-lived. Refresh token/session cookie must be `HttpOnly`, `Secure` in production, and an appropriate `SameSite` value; protect state-changing cookie-authenticated endpoints against CSRF. If a managed OIDC provider is selected instead, preserve the same API semantics.

### Endpoints

- `POST /auth/register` — create account; rate-limited.
- `POST /auth/verify-email` — verify signed, single-use verification token.
- `POST /auth/login` — create session and set secure refresh cookie.
- `POST /auth/refresh` — rotate refresh session/cookie.
- `POST /auth/logout` — revoke current session.
- `POST /auth/password/forgot` and `POST /auth/password/reset` — optional if password auth is used; rate-limited and non-enumerating.
- `GET /me` — profile and basic account state.

Never return password hashes or raw refresh tokens.

## 3. Player profile and save

- `GET /players/me` — profile plus canonical Faaz and F7 Score totals.
- `PATCH /players/me` — update allowed profile fields (e.g. display name).
- `GET /players/me/save` — return cloud save and version.
- `PUT /players/me/save` — body includes `expected_version`, `schema_version`, and `payload`; return new version. Return `409 SAVE_VERSION_CONFLICT` if the expected version is stale.
- `GET /players/me/unlocks` — list owned unlock IDs.

Save payload size and schema version must be validated. Disallow arbitrary fields that could be used to set currency/score.

## 4. Catalog and purchases

- `GET /catalog/unlocks` — enabled unlocks, costs and prerequisites.
- `POST /purchases` — body `{ "unlock_id": "object.tv", "idempotency_key": "uuid" }`.
- `GET /players/me/wallet/transactions?cursor=...` — paginated history.

Purchase response contains the purchase ID, unlock ID, resulting canonical Faaz balance and transaction timestamp. Server validates cost and prerequisites; client must not submit a price.

## 5. Event synchronization and rewards

- `POST /game-events/batch` — accept a bounded list of event receipts.
- Each event includes `event_id`, `event_type`, `client_sequence`, `client_occurred_at` and a minimal typed payload.
- Server returns an outcome for each event: accepted/rejected, reason code, accepted Faaz delta, accepted F7 Score delta and canonical balances.
- Batch processing is idempotent; retrying an event must not pay twice.
- Enforce batch-size limits, per-event validation and rate limits.

Do not expose a generic endpoint such as `POST /wallet/add` or `POST /score/set`.

## 6. Leaderboard

- `GET /leaderboard?scope=group|global&group_id=...&period=all_time&limit=...&cursor=...`
- Return stable rank, display name, score total and optional avatar key.
- Ranking uses F7 Score only.
- Do not expose email, user IDs or private account fields.
- Default scope and group invitation policy remain open; global scope must not be exposed until the owner chooses a privacy policy.

The local account API implements the all-time read and the signed-in account panel. Until D-008 selects a visibility policy, authenticated ranking requests return `403 RANKINGS_UNAVAILABLE`. A request parameter alone cannot grant access. A configured policy must resolve the viewer’s permitted accounts in the same read transaction as the score query.

The page size defaults to 25 and ranges from 1 to 100. Ties share a competition rank (1, 1, 3). Each entry contains `rank`, nullable `display_name` and `f7_score`. A continuation cursor identifies the revision and offset. A roster, score or name change returns `409 RANKINGS_CHANGED` so the client can refresh. Wallet purchases do not change a score page.

## 7. Health and operations

- `GET /health/live` — process liveness; no dependency checks.
- `GET /health/ready` — readiness including database availability.
- `GET /metrics` — restricted to internal monitoring network/authentication.

## 8. Example request/response shapes

### Save update

```json
{
  "expected_version": 4,
  "schema_version": 1,
  "payload": {
    "game_day": 3,
    "simulated_time": "evening",
    "characters": {},
    "preferences": {"reduced_motion": false, "volume": 0.7}
  }
}
```

### Purchase

```json
{
  "unlock_id": "object.tv",
  "idempotency_key": "b94d2c3e-0000-4000-8000-000000000001"
}
```

### Event batch

```json
{
  "events": [
    {
      "event_id": "b94d2c3e-0000-4000-8000-000000000002",
      "event_type": "request_completed",
      "client_sequence": 12,
      "client_occurred_at": "2026-01-01T12:00:00Z",
      "payload": {"request_type": "food_delivery", "duration_seconds": 18}
    }
  ]
}
```

These are illustrative schemas, not a final OpenAPI file. The implementation agent must create `packages/contracts/openapi/openapi.yaml`, fully define required/optional fields, bounds, security schemes and response codes, and validate generated client types against it.

## 9. HTTP status conventions

- `200` successful read/update.
- `201` resource created.
- `204` successful logout with no body.
- `400` malformed request.
- `401` unauthenticated.
- `403` authenticated but unauthorized.
- `404` resource not found/visible.
- `409` save conflict or idempotency conflict.
- `422` semantically invalid action.
- `429` rate limited.
- `500` unexpected server error.

## 10. API compatibility

Treat OpenAPI as a versioned contract. Breaking changes require a new API version or an explicit migration plan. Keep game content catalog IDs stable across releases; never rename an ID only because its display label changes.

## Local playtest contract

The implemented endpoints and response schemas are in [OpenAPI](../packages/contracts/openapi/openapi.yaml). The opt-in local API binds a browser to a development player with an HTTP-only session cookie. The catalog exposes development prices. State-changing requests require the configured web origin, and mutations on an existing player also require its ID as a precondition.

A request receipt identifies one character, activity, request, completion and duration in simulation ticks. Each eligible request pays once. Retrying the same receipt returns its accepted status. A change of intent under the same key returns a conflict. The batch reply gives per-receipt status and canonical player totals. A purchase returns its stored ID, unlock ID, timestamp and current canonical balances. The release API design above also calls for expanded game-event receipt metadata.

The local server also implements `GET` and `PUT /players/me/save` for the current browser session. Both operations require the player precondition. An initial write uses version zero. A later write must match the stored version. A stale writer receives `409 SAVE_VERSION_CONFLICT` and an empty slot returns `404 SAVE_NOT_FOUND`. Schema 1 includes the clock, household and five residents keyed by stable ID. The payload limit is 24 KiB within a 32 KiB request. Its JSON Schema is shared by Go validation and OpenAPI client generation.

The development player can query owned unlocks and paginated Faaz transactions. Wallet history uses a player-scoped cursor, orders ties by event ID, and limits a page to 100 entries.

## Verified local accounts

With the email adapter enabled, registration accepts an email address. The mailbox holder sets the password during verification. Verification and recovery tokens travel in a URL fragment and the form submits them to the API. The server checks purpose, signature, expiry and one-time use. Registration and recovery return the same accepted response for known and unknown addresses.

Login, verification, recovery and refresh set HTTP-only cookies. Access expires after 15 minutes. Refresh rotates both credentials within an absolute 30-day session. Logout revokes that browser's session. Resetting the password revokes every previous account session. The adapter requires the configured loopback web origin for writes. `GET /me` returns the owner's verified email, player ID and optional display name. `PATCH /players/me` accepts only `display_name` and requires the player precondition. Wallets, saves and unlocks accept the account access cookie through the existing authorization boundary.

## Revision contracts · 2026-11-20

The shared ApartmentCheckpoint schema admits the revised activity IDs, cooling/ready phases and readyAt. The existing batch endpoint accepts only catalog-eligible terminal receipts. Each outcome now includes amount_faaz, read from that owner’s posted ledger entry for an accepted event and zero for a rejected or conflicting event. Identical retries return the original amount. The client renders the returned wallet and F7 Score. No additional endpoint or balance-writing API is required.
