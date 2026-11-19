#!/usr/bin/env bash
set -euo pipefail

# Run from the intended repository root. Creates directories and empty placeholders only.
# It does not overwrite existing files or generate application source code.

dirs=(
  apps/web/public/assets/audio apps/web/public/assets/images
  apps/web/src/app apps/web/src/game/config apps/web/src/game/scenes
  apps/web/src/game/entities apps/web/src/game/systems apps/web/src/game/events
  apps/web/src/game/map apps/web/src/game/audio apps/web/src/game/rendering
  apps/web/src/ui apps/web/src/api apps/web/src/persistence apps/web/src/shared
  apps/web/tests/unit apps/web/tests/e2e
  apps/api/cmd/api apps/api/internal/config apps/api/internal/http
  apps/api/internal/auth apps/api/internal/players apps/api/internal/groups
  apps/api/internal/saves apps/api/internal/economy apps/api/internal/scoring
  apps/api/internal/leaderboard apps/api/internal/catalog apps/api/internal/health
  apps/api/internal/platform apps/api/migrations apps/api/tests/integration
  packages/contracts/openapi
  assets/source/characters/barbod assets/source/characters/kavian
  assets/source/characters/mahan assets/source/characters/parsa
  assets/source/characters/parham assets/source/apartment assets/source/objects
  assets/source/ui assets/source/audio assets/runtime/spritesheets
  assets/runtime/tilesets assets/runtime/maps assets/runtime/audio assets/manifests
  infra/docker infra/proxy infra/deploy infra/monitoring
  scripts tests/e2e tests/fixtures
)
for dir in "${dirs[@]}"; do
  mkdir -p "$dir"
  touch "$dir/.gitkeep"
done

# Root placeholders; create only when absent.
for file in .gitignore .env.example Makefile; do
  [[ -e "$file" ]] || touch "$file"
done

echo "F7 directory scaffold created. Existing files were not overwritten."
