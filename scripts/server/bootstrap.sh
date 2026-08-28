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
select_environment "$@"

for command_name in git node pnpm docker curl openssl; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Missing command: $command_name"
done
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'

node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
[[ "$node_major" == '24' ]] || fail "Node 24 is required; found $(node --version)."

expected_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]")"
actual_pnpm="$(pnpm --version)"
[[ "$actual_pnpm" == "$expected_pnpm" ]] || fail "pnpm $expected_pnpm is required; found $actual_pnpm."

require_environment
[[ -f apps/web/.env.local ]] || fail 'Missing apps/web/.env.local.'

if grep -Eq 'replace-with-|<(YOUR_)?DOMAIN>' "$ENV_FILE" apps/web/.env.local; then
  fail 'Environment files still contain template placeholders.'
fi

compose_environment config --quiet

if [[ "$(uname -s)" != 'Linux' ]]; then
  log 'Warning: server templates target Linux; current host is not Linux.'
fi

log "Project: $PROJECT_DIR"
log 'Environment: production'
log "Compose project: $COMPOSE_PROJECT"
log "Node: $(node --version)"
log "pnpm: $actual_pnpm"
log 'Environment and server Compose preflight passed.'
