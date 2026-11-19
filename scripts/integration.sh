#!/usr/bin/env bash
# Each run owns a fresh Compose project and volume, even during parallel CI jobs.
set -euo pipefail
project="f7-test-$(openssl rand -hex 8)"
export PGHOST=127.0.0.1 PGUSER=f7 PGDATABASE=f7 PGSSLMODE=disable
PGPASSWORD=$(openssl rand -hex 32)
export PGPASSWORD
compose=(docker compose --env-file /dev/null -p "$project" -f infra/docker/compose.dev.yml)
db() { PGPORT=0 "${compose[@]}" "$@"; }
trap 'db down --volumes' EXIT
db up -d --wait
address=$(db port db 5432)
export PGPORT="${address##*:}"
migrate_db() { migrate -path apps/api/migrations -database 'postgres:///?search_path=public' "$@"; }
has_namespace() { db exec -T db psql -XAt -v ON_ERROR_STOP=1 -U "$PGUSER" -d "$PGDATABASE" -c "SELECT to_regnamespace('f7') IS NOT NULL"; }
migrate_db up
[[ $(has_namespace) == t ]]
migrate_db up
migrate_db down 1
[[ $(has_namespace) == f ]]
migrate_db up
[[ $(has_namespace) == t ]]
(cd apps/api && go test -count=1 -tags=integration ./tests/integration)
