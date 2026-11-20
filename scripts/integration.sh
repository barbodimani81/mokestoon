#!/usr/bin/env bash
# Each run owns a fresh Compose project and volume, even during parallel CI jobs.
set -euo pipefail
project="f7-test-$(openssl rand -hex 8)"
export PGHOST=127.0.0.1 PGUSER=f7 PGDATABASE=f7 PGSSLMODE=disable
PGPASSWORD=$(openssl rand -hex 32)
export PGPASSWORD
compose=(docker compose --env-file /dev/null -p "$project" -f infra/docker/compose.dev.yml)
db() { PGPORT=0 "${compose[@]}" "$@"; }
trap 'db --profile accounts down --volumes' EXIT
if [[ ${1:-} == --browser ]]; then
  export F7_MAIL_SMTP_PORT=0 F7_MAIL_UI_PORT=0
  db up -d --wait db mailpit
else
  db up -d --wait db
fi
address=$(db port db 5432)
export PGPORT="${address##*:}"
migrate_db() { migrate -path apps/api/migrations -database 'postgres:///?search_path=public' "$@"; }
has_namespace() { db exec -T db psql -XAt -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -c "SELECT to_regnamespace('f7') IS NOT NULL"; }
migrate_db up
[[ $(has_namespace) == t ]]
migrate_db up
migrate_db down 1
[[ $(db exec -T db psql -XAt -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -c "SELECT to_regclass('f7.account_sessions') IS NULL AND to_regclass('f7.player_saves') IS NOT NULL") == t ]]
migrate_db down 1
[[ $(db exec -T db psql -XAt -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -c "SELECT to_regclass('f7.player_saves') IS NULL AND to_regclass('f7.users') IS NOT NULL") == t ]]
migrate_db down 1
[[ $(has_namespace) == t ]]
[[ $(db exec -T db psql -XAt -U "$PGUSER" -d "$PGDATABASE" -c "SELECT to_regclass('f7.wallet_transactions') IS NULL") == t ]]
migrate_db down 1
[[ $(has_namespace) == f ]]
migrate_db up
[[ $(has_namespace) == t ]]
(cd apps/api && go test -race -count=1 -tags=integration ./tests/integration)

if [[ ${1:-} == --browser ]]; then
  export APP_ENV=local F7_PLAYTEST=1 HTTP_ADDR=127.0.0.1:18347 PUBLIC_WEB_ORIGIN=http://127.0.0.1:4173
  smtp=$(db port mailpit 1025)
  inbox=$(db port mailpit 8025)
  export F7_AUTH_METHOD=email F7_SMTP_ADDR="$smtp" F7_TEST_INBOX="http://$inbox"
  F7_AUTH_SIGNING_KEY=$(openssl rand -hex 32)
  export F7_AUTH_SIGNING_KEY
  tmpdir=$(mktemp -d)
  (cd apps/api && go build -o "$tmpdir/api" ./cmd/api)
  "$tmpdir/api" > "$tmpdir/api.log" 2>&1 &
  api_pid=$!
  trap 'kill "$api_pid" 2>/dev/null || true; wait "$api_pid" || true; rm -f "$tmpdir/api" "$tmpdir/api.log"; rmdir "$tmpdir"; db --profile accounts down --volumes' EXIT
  for attempt in {1..40}; do
    if ! kill -0 "$api_pid" 2>/dev/null; then cat "$tmpdir/api.log"; exit 1; fi
    if curl -fsS "http://$HTTP_ADDR/api/v1/health/ready" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  (cd apps/web && npm exec -- playwright test --config playwright.playtest.config.ts)
fi
