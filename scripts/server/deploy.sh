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

# shellcheck source=profile.sh
source "$SCRIPT_DIR/profile.sh"
select_profile "${1:-}"
require_profile_environment

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail 'Project is not a Git working tree.'
[[ -z "$(git status --porcelain)" ]] || fail 'Working tree is dirty. Commit or discard server changes explicitly; deploy will not auto-stash.'

if [[ "$PROFILE" == 'staging' ]]; then
  log 'Fetching the verified STAGING source branch.'
  git fetch origin main
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
  [[ "$upstream" == 'origin/main' ]] || fail 'STAGING worktree must track origin/main.'
fi

log "Pulling the $PROFILE tracked branch with fast-forward only."
git pull --ff-only

if [[ "$PROFILE" == 'staging' ]]; then
  [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || fail 'STAGING HEAD is not the current origin/main commit.'
fi

log "Candidate commit: $(git rev-parse --short=12 HEAD)"

"$SCRIPT_DIR/bootstrap.sh" "$PROFILE"

log 'Installing the exact lockfile dependency graph.'
pnpm install --frozen-lockfile

log 'Starting localhost-bound PostgreSQL and MinIO.'
compose_profile up -d --wait postgres minio
compose_profile run --rm minio-init

log 'Running lint before changing the deployed application.'
pnpm lint

if [[ "$PROFILE" == 'staging' ]]; then
  log 'Running the full test suite before STAGING migration/restart.'
  pnpm test
fi

log 'Building all workspaces before migration/restart.'
pnpm build

log 'Applying committed Prisma migrations.'
pnpm db:deploy

case "$RESTART_MODE" in
  systemd)
    log "Restarting only the $PROFILE systemd application services."
    sudo systemctl restart "defterdar-api@$PROFILE.service"
    sudo systemctl restart "defterdar-web@$PROFILE.service"
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
  "$SCRIPT_DIR/verify.sh" "$PROFILE"
fi

log 'Deployment workflow completed.'
