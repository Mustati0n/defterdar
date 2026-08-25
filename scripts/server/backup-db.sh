#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
BACKUP_ROOT="${DEFTERDAR_BACKUP_DIR:-$HOME/defterdar-backups}"
BACKUP_DIR="$BACKUP_ROOT/postgres"
TIMESTAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
OUTPUT_FILE="$BACKUP_DIR/defterdar-$TIMESTAMP.dump"
cd "$PROJECT_DIR"

umask 077
mkdir -p "$BACKUP_DIR"
trap 'rm -f -- "$OUTPUT_FILE"' ERR

docker compose -f compose.server.yml exec -T postgres \
  sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  >"$OUTPUT_FILE"

trap - ERR
printf '[backup-db] Created %s\n' "$OUTPUT_FILE"
