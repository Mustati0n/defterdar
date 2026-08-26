#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"

fail() {
  printf '[remote-dev] ERROR: %s\n' "$*" >&2
  exit 1
}

# shellcheck source=profile.sh
source "$SCRIPT_DIR/profile.sh"
select_profile "${1:-}"
[[ "$PROFILE" == 'dev' ]] || fail 'Hot reload is allowed only for the dev profile.'
require_profile_environment

web_port="$(read_env_value "$ENV_FILE" PORT)"
api_port="$(read_env_value "$ENV_FILE" API_PORT)"

printf '[remote-dev] Starting DEV hot reload on web %s and API %s.\n' "$web_port" "$api_port"
printf '[remote-dev] Stop defterdar-api@dev and defterdar-web@dev first if systemd currently owns these ports.\n'
exec env PORT="$web_port" API_PORT="$api_port" pnpm dev
