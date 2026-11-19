#!/bin/sh
set -eu
if [ ! -r .env ]; then
  echo 'Run make init first.' >&2
  exit 1
fi
set -a
. ./.env
set +a
exec "$@"
