#!/bin/sh
set -eu
if [ -e .env ]; then
  echo "Using existing .env"
  exit 0
fi
umask 077
tmp=$(mktemp .env.XXXXXX)
trap 'rm -f "$tmp"' EXIT
password=$(openssl rand -hex 32)
sed "s/^PGPASSWORD=$/PGPASSWORD=$password/" .env.example > "$tmp"
# Link atomically to avoid replacing another developer setup.
ln "$tmp" .env
echo "Created private local configuration in .env"
