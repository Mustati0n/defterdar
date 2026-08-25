#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
API_URL="${DEFTERDAR_API_URL:-http://127.0.0.1:3001}"
WEB_URL="${DEFTERDAR_WEB_URL:-http://127.0.0.1:3000}"
MINIO_URL="${DEFTERDAR_MINIO_URL:-http://127.0.0.1:9000}"
cd "$PROJECT_DIR"

check_url() {
  local label="$1"
  local url="$2"
  curl --fail --silent --show-error --location --max-time 10 "$url" >/dev/null
  printf '[verify] PASS: %s (%s)\n' "$label" "$url"
}

docker compose -f compose.server.yml exec -T postgres \
  sh -c 'exec pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null
printf '[verify] PASS: PostgreSQL readiness\n'

check_url 'MinIO health' "$MINIO_URL/minio/health/live"
check_url 'API health' "$API_URL/health"
check_url 'API readiness' "$API_URL/health/ready"
check_url 'Web response' "$WEB_URL/"

printf '[verify] All server checks passed.\n'
