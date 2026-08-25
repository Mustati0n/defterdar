#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
RESTART_MODE="${DEFTERDAR_RESTART_MODE:-systemd}"
SKIP_VERIFY="${DEFTERDAR_SKIP_VERIFY:-0}"
cd "$PROJECT_DIR"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail 'Project is not a Git working tree.'
[[ -z "$(git status --porcelain)" ]] || fail 'Working tree is dirty. Commit or discard server changes explicitly; deploy will not auto-stash.'

log 'Pulling the tracked branch with fast-forward only.'
git pull --ff-only

"$SCRIPT_DIR/bootstrap.sh"

log 'Installing the exact lockfile dependency graph.'
pnpm install --frozen-lockfile

log 'Starting localhost-bound PostgreSQL and MinIO.'
docker compose -f compose.server.yml up -d --wait postgres minio
docker compose -f compose.server.yml run --rm minio-init

log 'Applying committed Prisma migrations.'
pnpm db:deploy

log 'Building all workspaces.'
pnpm build

case "$RESTART_MODE" in
  systemd)
    log 'Restarting systemd application services.'
    sudo systemctl restart defterdar-api.service
    sudo systemctl restart defterdar-web.service
    ;;
  none)
    log 'Restart skipped (DEFTERDAR_RESTART_MODE=none).'
    ;;
  *)
    fail "Unsupported DEFTERDAR_RESTART_MODE: $RESTART_MODE"
    ;;
esac

if [[ "$SKIP_VERIFY" == '1' ]]; then
  log 'Verification skipped (DEFTERDAR_SKIP_VERIFY=1).'
elif [[ "$RESTART_MODE" == 'none' ]]; then
  log 'Application verification skipped because no process restart method was selected.'
else
  "$SCRIPT_DIR/verify.sh"
fi

log 'Deployment workflow completed.'
