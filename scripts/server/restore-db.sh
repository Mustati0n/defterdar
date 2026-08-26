#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

fail() {
  printf '[restore-db] ERROR: %s\n' "$*" >&2
  exit 1
}

# shellcheck source=profile.sh
source "$SCRIPT_DIR/profile.sh"
select_profile "${1:-}"
require_profile_environment

if [[ "${2:-}" != '--confirm' || -z "${3:-}" ]]; then
  printf 'Usage: %s dev|staging --confirm /absolute/path/to/backup.dump\n' "$0" >&2
  printf 'This replaces objects in the configured PostgreSQL database. Stop application services first.\n' >&2
  exit 2
fi

BACKUP_FILE="$3"
[[ "$BACKUP_FILE" = /* ]] || {
  printf '[restore-db] ERROR: backup path must be absolute.\n' >&2
  exit 1
}
[[ -f "$BACKUP_FILE" ]] || {
  printf '[restore-db] ERROR: backup does not exist: %s\n' "$BACKUP_FILE" >&2
  exit 1
}

printf '[restore-db] Restoring %s into the configured database.\n' "$BACKUP_FILE"
compose_profile exec -T postgres \
  sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  <"$BACKUP_FILE"
printf '[restore-db] Restore completed. Run pnpm db:status and scripts/server/verify.sh %s.\n' "$PROFILE"
