#!/usr/bin/env bash
set -Eeuo pipefail

fail() {
  printf '[check-isolation] ERROR: %s\n' "$*" >&2
  exit 1
}

ALLOW_PLACEHOLDERS='0'
if [[ "${1:-}" == '--templates' ]]; then
  ALLOW_PLACEHOLDERS='1'
  shift
fi

[[ "$#" == '2' ]] || fail 'Usage: check-isolation.sh [--templates] /absolute/dev/.env /absolute/staging/.env'
DEV_ENV="$1"
STAGING_ENV="$2"
[[ "$DEV_ENV" = /* && "$STAGING_ENV" = /* ]] || fail 'Both environment paths must be absolute.'
[[ -f "$DEV_ENV" ]] || fail "DEV environment file not found: $DEV_ENV"
[[ -f "$STAGING_ENV" ]] || fail "STAGING environment file not found: $STAGING_ENV"

read_value() {
  local file="$1"
  local key="$2"
  local count
  local value

  count="$(grep -Ec "^${key}=" "$file" || true)"
  [[ "$count" == '1' ]] || fail "$file must contain exactly one $key entry."
  value="$(sed -n "s/^${key}=//p" "$file")"
  [[ -n "$value" ]] || fail "$key must not be empty in $file."
  printf '%s' "$value"
}

[[ "$(read_value "$DEV_ENV" DEFTERDAR_ENVIRONMENT)" == 'dev' ]] || fail 'DEV file has the wrong environment identity.'
[[ "$(read_value "$STAGING_ENV" DEFTERDAR_ENVIRONMENT)" == 'staging' ]] || fail 'STAGING file has the wrong environment identity.'
[[ "$(read_value "$DEV_ENV" COMPOSE_PROJECT_NAME)" == 'defterdar-dev' ]] || fail 'DEV Compose project must be defterdar-dev.'
[[ "$(read_value "$STAGING_ENV" COMPOSE_PROJECT_NAME)" == 'defterdar-staging' ]] || fail 'STAGING Compose project must be defterdar-staging.'

keys=(
  PORT
  API_PORT
  CORS_ORIGINS
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_PORT
  DATABASE_URL
  JWT_ACCESS_SECRET
  MINIO_ROOT_USER
  MINIO_ROOT_PASSWORD
  MINIO_API_PORT
  MINIO_CONSOLE_PORT
  S3_ENDPOINT
  S3_BUCKET
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
)

for key in "${keys[@]}"; do
  dev_value="$(read_value "$DEV_ENV" "$key")"
  staging_value="$(read_value "$STAGING_ENV" "$key")"
  [[ "$dev_value" != "$staging_value" ]] || fail "$key must differ between DEV and STAGING."
done

for environment_file in "$DEV_ENV" "$STAGING_ENV"; do
  [[ "$(read_value "$environment_file" MINIO_ROOT_USER)" == "$(read_value "$environment_file" S3_ACCESS_KEY_ID)" ]] || fail 'MinIO and S3 access identities must match within each environment.'
  [[ "$(read_value "$environment_file" MINIO_ROOT_PASSWORD)" == "$(read_value "$environment_file" S3_SECRET_ACCESS_KEY)" ]] || fail 'MinIO and S3 secrets must match within each environment.'

  database_url="$(read_value "$environment_file" DATABASE_URL)"
  test_database_url="$(read_value "$environment_file" TEST_DATABASE_URL)"
  database_user="$(read_value "$environment_file" POSTGRES_USER)"
  database_name="$(read_value "$environment_file" POSTGRES_DB)"
  database_port="$(read_value "$environment_file" POSTGRES_PORT)"
  [[ "$database_url" == "postgresql://${database_user}:"*"@127.0.0.1:${database_port}/${database_name}?schema=public" ]] || fail 'DATABASE_URL does not match its PostgreSQL identity/port/database.'
  [[ "$test_database_url" == "postgresql://${database_user}:"*"@127.0.0.1:${database_port}/${database_name}?schema=auth_e2e" ]] || fail 'TEST_DATABASE_URL does not match its PostgreSQL identity/port/database.'
done

port_keys=(PORT API_PORT POSTGRES_PORT MINIO_API_PORT MINIO_CONSOLE_PORT)
for dev_port_key in "${port_keys[@]}"; do
  dev_port="$(read_value "$DEV_ENV" "$dev_port_key")"
  for staging_port_key in "${port_keys[@]}"; do
    staging_port="$(read_value "$STAGING_ENV" "$staging_port_key")"
    [[ "$dev_port" != "$staging_port" ]] || fail "$dev_port_key in DEV collides with $staging_port_key in STAGING."
  done
done

if [[ "$ALLOW_PLACEHOLDERS" != '1' ]] && grep -Eq 'replace-with-|<(YOUR_)?DOMAIN>' "$DEV_ENV" "$STAGING_ENV"; then
  fail 'Environment files still contain template placeholders.'
fi

[[ "$(read_value "$DEV_ENV" CORS_ORIGINS)" == https://* ]] || fail 'DEV public origin must use HTTPS.'
[[ "$(read_value "$STAGING_ENV" CORS_ORIGINS)" == https://* ]] || fail 'STAGING public origin must use HTTPS.'

printf '[check-isolation] PASS: DEV and STAGING identities, ports, databases, storage and credentials are distinct.\n'
