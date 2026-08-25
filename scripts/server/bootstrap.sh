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

for command_name in git node pnpm docker curl openssl; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Missing command: $command_name"
done
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is required.'

node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
[[ "$node_major" == '24' ]] || fail "Node 24 is required; found $(node --version)."

expected_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]")"
actual_pnpm="$(pnpm --version)"
[[ "$actual_pnpm" == "$expected_pnpm" ]] || fail "pnpm $expected_pnpm is required; found $actual_pnpm."

[[ -f .env ]] || fail 'Missing .env. Copy .env.server.example and configure it.'
[[ -f apps/web/.env.local ]] || fail 'Missing apps/web/.env.local. Copy apps/web/.env.server.example.'

if grep -Eq 'replace-with-|<YOUR_DOMAIN>' .env apps/web/.env.local; then
  fail 'Environment files still contain template placeholders.'
fi

docker compose -f compose.server.yml config --quiet

if [[ "$(uname -s)" != 'Linux' ]]; then
  log 'Warning: server templates target Linux; current host is not Linux.'
fi

log "Project: $PROJECT_DIR"
log "Node: $(node --version)"
log "pnpm: $actual_pnpm"
log 'Environment and server Compose preflight passed.'
