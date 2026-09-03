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
select_environment "$@"
require_environment

git_command=(git)
if [[ "$EUID" -eq 0 ]]; then
  git_command+=( -c "safe.directory=$PROJECT_DIR" )
fi

"${git_command[@]}" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail 'Project is not a Git working tree.'
[[ -z "$("${git_command[@]}" status --porcelain)" ]] || fail 'Working tree is dirty. Commit or discard server changes explicitly; deploy will not auto-stash.'

log "Candidate commit: $("${git_command[@]}" rev-parse --short=12 HEAD)"

"$SCRIPT_DIR/bootstrap.sh"

log 'Installing the exact lockfile dependency graph.'
CI=true pnpm install --frozen-lockfile

log 'Starting localhost-bound PostgreSQL and MinIO.'
compose_environment up -d --wait postgres minio
compose_environment run --rm minio-init

log 'Running lint before changing the deployed application.'
pnpm lint

log 'Running the full test suite before migration/restart.'
pnpm test

log 'Building all workspaces before migration/restart.'
pnpm build

log 'Applying committed Prisma migrations.'
pnpm db:deploy

case "$RESTART_MODE" in
  systemd)
    log 'Restarting canonical Defterdar application services.'
    if [[ "$EUID" -eq 0 ]]; then
      systemctl restart defterdar-api.service
      systemctl restart defterdar-web.service
    else
      sudo systemctl restart defterdar-api.service
      sudo systemctl restart defterdar-web.service
    fi
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
