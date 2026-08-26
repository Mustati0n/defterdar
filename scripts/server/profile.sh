#!/usr/bin/env bash

# Shared by server helpers. Call select_profile after SCRIPT_DIR and PROJECT_DIR
# are defined by the entrypoint script.

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

select_profile() {
  PROFILE="${1:-}"
  case "$PROFILE" in
    dev)
      OTHER_PROFILE='staging'
      ;;
    staging)
      OTHER_PROFILE='dev'
      ;;
    *)
      fail 'Environment argument is required: dev or staging.'
      ;;
  esac

  # Prisma and Nest both resolve the worktree root .env. Do not allow a helper
  # override that could make Compose and migration/runtime target different data.
  ENV_FILE="$PROJECT_DIR/.env"
  COMPOSE_PROJECT="defterdar-$PROFILE"
}

require_profile_environment() {
  local configured_profile
  local configured_project

  [[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE. Copy .env.$PROFILE.example to .env."
  configured_profile="$(read_env_value "$ENV_FILE" DEFTERDAR_ENVIRONMENT)"
  configured_project="$(read_env_value "$ENV_FILE" COMPOSE_PROJECT_NAME)"

  [[ "$configured_profile" == "$PROFILE" ]] || fail "Environment file identifies $configured_profile, not $PROFILE."
  [[ "$configured_project" == "$COMPOSE_PROJECT" ]] || fail "COMPOSE_PROJECT_NAME must be $COMPOSE_PROJECT for $PROFILE."
}

compose_profile() {
  docker compose \
    --env-file "$ENV_FILE" \
    --project-name "$COMPOSE_PROJECT" \
    -f "$PROJECT_DIR/compose.server.yml" \
    "$@"
}
