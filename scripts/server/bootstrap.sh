#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

log() {
  printf '[bootstrap] %s\n' "$*"
}

fail() {
  printf '[bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

# shellcheck source=profile.sh
source "$SCRIPT_DIR/profile.sh"
select_profile "${1:-}"

for command_name in git node pnpm docker curl openssl; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Missing command: $command_name"
done
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'

node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
[[ "$node_major" == '24' ]] || fail "Node 24 is required; found $(node --version)."

expected_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]")"
actual_pnpm="$(pnpm --version)"
[[ "$actual_pnpm" == "$expected_pnpm" ]] || fail "pnpm $expected_pnpm is required; found $actual_pnpm."

require_profile_environment
[[ -f apps/web/.env.local ]] || fail "Missing apps/web/.env.local. Copy apps/web/.env.$PROFILE.example."

if grep -Eq 'replace-with-|<(YOUR_)?DOMAIN>' "$ENV_FILE" apps/web/.env.local; then
  fail 'Environment files still contain template placeholders.'
fi

compose_profile config --quiet

other_env="$(dirname "$PROJECT_DIR")/defterdar-$OTHER_PROFILE/.env"
if [[ -f "$other_env" ]]; then
  if [[ "$PROFILE" == 'dev' ]]; then
    "$SCRIPT_DIR/check-isolation.sh" "$ENV_FILE" "$other_env"
  else
    "$SCRIPT_DIR/check-isolation.sh" "$other_env" "$ENV_FILE"
  fi
else
  log "Other profile environment not found at $other_env; run check-isolation.sh after both worktrees are configured."
fi

if [[ "$(uname -s)" != 'Linux' ]]; then
  log 'Warning: server templates target Linux; current host is not Linux.'
fi

log "Project: $PROJECT_DIR"
log "Environment: $PROFILE"
log "Compose project: $COMPOSE_PROJECT"
log "Node: $(node --version)"
log "pnpm: $actual_pnpm"
log 'Environment and server Compose preflight passed.'
