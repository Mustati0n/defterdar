#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

fail() {
  printf '[verify] ERROR: %s\n' "$*" >&2
  exit 1
}

# shellcheck source=profile.sh
source "$SCRIPT_DIR/profile.sh"
select_environment "$@"
require_environment

API_URL="${DEFTERDAR_API_URL:-http://127.0.0.1:$(read_env_value "$ENV_FILE" API_PORT)}"
WEB_URL="${DEFTERDAR_WEB_URL:-http://127.0.0.1:$(read_env_value "$ENV_FILE" PORT)}"
MINIO_URL="${DEFTERDAR_MINIO_URL:-$(read_env_value "$ENV_FILE" S3_ENDPOINT)}"

check_url() {
  local label="$1"
  local url="$2"
  local attempt

  for attempt in {1..20}; do
    if curl --fail --silent --location --max-time 10 "$url" >/dev/null 2>&1; then
      printf '[verify] PASS: %s (%s)\n' "$label" "$url"
      return
    fi
    sleep 1
  done

  curl --fail --silent --show-error --location --max-time 10 "$url" >/dev/null
}

compose_environment exec -T postgres \
  sh -c 'exec pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null
printf '[verify] PASS: PostgreSQL readiness\n'

check_url 'MinIO health' "$MINIO_URL/minio/health/live"
check_url 'API health' "$API_URL/health"
check_url 'API readiness' "$API_URL/health/ready"
check_url 'Web response' "$WEB_URL/"

printf '[verify] All canonical server checks passed.\n'
