#!/bin/sh
# Called via with-local-env from the repository root.
set -eu
if [ -z "${F7_AUTH_SIGNING_KEY:-}" ]; then
  key_file=.env.account-key
  if [ ! -f "$key_file" ]; then
    umask 077
    tmp=$(mktemp .env.account-key.XXXXXX)
    trap 'rm -f "$tmp"' EXIT
    openssl rand -hex 32 > "$tmp"
    ln "$tmp" "$key_file" 2>/dev/null || test -f "$key_file"
    rm -f "$tmp"
  fi
  F7_AUTH_SIGNING_KEY=$(cat "$key_file")
fi
export F7_AUTH_SIGNING_KEY F7_AUTH_METHOD=email APP_ENV=local F7_PLAYTEST=1
export F7_SMTP_ADDR="${F7_SMTP_ADDR:-127.0.0.1:${F7_MAIL_SMTP_PORT:-51025}}"
cd apps/api
exec go run ./cmd/api
