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
