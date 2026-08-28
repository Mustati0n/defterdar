#!/usr/bin/env bash

# Shared by server helpers for the single canonical Defterdar environment.

read_env_value() {
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

select_environment() {
  [[ "$#" == '0' ]] || fail 'This server has one environment; no environment argument is accepted.'
  ENV_FILE="$PROJECT_DIR/.env"
  COMPOSE_PROJECT='defterdar'
}

require_environment() {
  local configured_profile
  local configured_project

  [[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE."
  configured_profile="$(read_env_value "$ENV_FILE" DEFTERDAR_ENVIRONMENT)"
  configured_project="$(read_env_value "$ENV_FILE" COMPOSE_PROJECT_NAME)"

  [[ "$configured_profile" == 'production' ]] || fail 'DEFTERDAR_ENVIRONMENT must be production.'
  [[ "$configured_project" == "$COMPOSE_PROJECT" ]] || fail "COMPOSE_PROJECT_NAME must be $COMPOSE_PROJECT."
}

compose_environment() {
  docker compose \
    --env-file "$ENV_FILE" \
    --project-name "$COMPOSE_PROJECT" \
    -f "$PROJECT_DIR/compose.server.yml" \
    "$@"
}
