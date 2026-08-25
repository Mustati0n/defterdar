#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

if [[ "${1:-}" != '--confirm' || -z "${2:-}" ]]; then
  printf 'Usage: %s --confirm /absolute/path/to/backup.dump\n' "$0" >&2
  printf 'This replaces objects in the configured PostgreSQL database. Stop application services first.\n' >&2
  exit 2
fi

BACKUP_FILE="$2"
[[ "$BACKUP_FILE" = /* ]] || {
  printf '[restore-db] ERROR: backup path must be absolute.\n' >&2
  exit 1
}
[[ -f "$BACKUP_FILE" ]] || {
  printf '[restore-db] ERROR: backup does not exist: %s\n' "$BACKUP_FILE" >&2
  exit 1
}

printf '[restore-db] Restoring %s into the configured database.\n' "$BACKUP_FILE"
docker compose -f compose.server.yml exec -T postgres \
  sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  <"$BACKUP_FILE"
printf '[restore-db] Restore completed. Run pnpm db:status and scripts/server/verify.sh.\n'
