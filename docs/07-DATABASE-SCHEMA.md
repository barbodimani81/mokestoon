# 07 — Database Schema and Persistence

## 1. Principles

- PostgreSQL is canonical for accounts, cloud profile, unlocks, confirmed balances, score and leaderboard.
- Use UUID primary keys unless a natural immutable key is clearly better.
- Store timestamps as `timestamptz` in UTC.
- Use migrations for every schema change.
- Keep wallet and score history append-only; derive balances from ledger entries or maintain a transactionally updated cached balance backed by the ledger.
- Never allow the client to set balances directly.

## 2. Core tables

### `users`
- `id UUID PK`
- `email CITEXT UNIQUE NOT NULL` (or provider subject if an OIDC provider is selected)
- `password_hash TEXT NULL` (null for external identity)
- `email_verified_at TIMESTAMPTZ NULL`
- `status TEXT NOT NULL` (`active`, `disabled`, `pending_verification`)
- `created_at`, `updated_at`

### `sessions`
- `id UUID PK`
- `user_id UUID FK users`
- `token_hash TEXT UNIQUE NOT NULL` (store hash, not raw refresh token)
- `expires_at TIMESTAMPTZ NOT NULL`
- `revoked_at TIMESTAMPTZ NULL`
- `created_at`, `last_used_at`

### `player_profiles`
- `user_id UUID PK/FK users`
- `display_name TEXT NOT NULL`
- `avatar_key TEXT NULL`
- `created_at`, `updated_at`
- Unique/validation policy for display names must be decided and enforced.

### `player_saves`
- `user_id UUID PK/FK users`
- `version BIGINT NOT NULL DEFAULT 0`
- `schema_version INTEGER NOT NULL`
- `payload JSONB NOT NULL`
- `updated_at TIMESTAMPTZ NOT NULL`
- Save payload is bounded and schema-validated. Do not put secrets or raw audio files in it.

### `unlock_catalog`
- `id TEXT PK` stable key (e.g. `object.tv`, `activity.ps4`)
- `name TEXT NOT NULL`
- `category TEXT NOT NULL`
- `cost_faaz BIGINT NOT NULL CHECK (cost_faaz >= 0)`
- `prerequisites JSONB NOT NULL DEFAULT '[]'`
- `enabled BOOLEAN NOT NULL DEFAULT FALSE` until content and price are approved
- `config JSONB NOT NULL DEFAULT '{}'`
- `updated_at`

### `player_unlocks`
- `user_id UUID FK users`
- `unlock_id TEXT FK unlock_catalog`
- `unlocked_at TIMESTAMPTZ NOT NULL`
- `purchase_id UUID NULL`
- Primary key (`user_id`, `unlock_id`)

### `wallet_transactions`
- `id UUID PK`
- `user_id UUID FK users`
- `idempotency_key TEXT NOT NULL`
- `event_type TEXT NOT NULL` (`reward`, `purchase`, `admin_adjustment`, `reversal`)
- `amount BIGINT NOT NULL` (positive/negative delta)
- `reason_code TEXT NOT NULL`
- `reference_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- Unique (`user_id`, `idempotency_key`)
- Balance cannot become negative unless a later product decision explicitly permits credit.

### `score_transactions`
- `id UUID PK`
- `user_id UUID FK users`
- `idempotency_key TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `points BIGINT NOT NULL CHECK (points > 0)`
- `reason_code TEXT NOT NULL`
- `reference_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL`
- Unique (`user_id`, `idempotency_key`)
- No spending/debit operation for F7 Score.

### `game_event_receipts`
- `id UUID PK` (client event UUID)
- `user_id UUID FK users`
- `event_type TEXT NOT NULL`
- `payload JSONB NOT NULL`
- `client_sequence BIGINT NOT NULL`
- `client_occurred_at TIMESTAMPTZ NULL`
- `server_received_at TIMESTAMPTZ NOT NULL`
- `validation_status TEXT NOT NULL` (`accepted`, `rejected`, `pending_review`)
- `validation_reason TEXT NULL`
- Unique (`user_id`, `id`), unique (`user_id`, `client_sequence`) if sequence is strictly monotonic per device/session.

### `groups` and `group_memberships` (private leaderboard)
- `groups`: `id UUID PK`, `name TEXT`, `invite_code_hash TEXT UNIQUE`, `created_by UUID FK users`, `created_at`.
- `group_memberships`: `group_id UUID FK groups`, `user_id UUID FK users`, `role TEXT`, `joined_at TIMESTAMPTZ`; primary key (`group_id`, `user_id`).
- Group/private-vs-global visibility is an open product decision. Build these tables only if the private-group default is approved; otherwise defer them.

## 3. Balance queries

Canonical Faaz balance is the sum of accepted wallet transaction deltas for the user, optionally cached in a `player_wallets` table updated in the same database transaction. F7 Score is the sum of accepted score transactions. If caches are used, reconciliation jobs/tests must prove cache equals ledger sum.

Use database transactions for purchase:
1. Lock wallet row or serialize account ledger mutation.
2. Check idempotency key.
3. Verify item enabled, prerequisites met and balance sufficient.
4. Insert negative wallet transaction.
5. Insert player unlock.
6. Commit.

Use database transactions for rewards:
1. Check event receipt/idempotency.
2. Validate event type, allowed amount and rate/cap constraints.
3. Insert receipt and allowed ledger transaction(s).
4. Commit.

## 4. Save payload

The JSONB save should contain gameplay state that is useful to restore but is not the canonical ledger:
- `save_schema_version`.
- `game_day` and simulated time phase.
- Character current/last-known state and positions keyed by stable character IDs.
- Active unlock IDs (or load them from `player_unlocks`; avoid duplicated authority).
- Music/vibe preferences (not raw audio bytes).
- Event/quest progress that cannot be reconstructed from ledgers.
- Local preferences such as volume, reduced motion and UI settings.

Do not put Faaz or F7 Score totals in save payload as the authoritative value. Load canonical totals from ledger/balance query. The client may cache them for display with a stale/pending marker.

## 5. Indexes and constraints

- `users(email)` unique case-insensitive.
- `sessions(user_id, expires_at)`.
- `wallet_transactions(user_id, created_at DESC)`.
- `score_transactions(user_id, created_at DESC)`.
- `game_event_receipts(user_id, server_received_at DESC)`.
- `group_memberships(user_id, group_id)` and leaderboard query indexes once group policy is confirmed.
- Add database check constraints for non-negative costs, positive score points and legal statuses.

## 6. Retention and privacy

- Define account deletion/export policy before public release.
- Retain only the personal data necessary for authentication and leaderboard.
- Do not store user-imported music in the database.
- Avoid storing private source photos in public asset buckets.
- Logs must not include credentials, session tokens or raw authentication headers.

## 7. Migration sequence

Start with users/sessions/profiles, then saves, catalog/unlocks, ledgers/event receipts, then groups if approved. Each migration must have a clear rollback strategy and be tested against an empty database and the previous migration state.
