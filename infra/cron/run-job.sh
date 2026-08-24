#!/usr/bin/env bash

# Crontab uses the host timezone (Azure images are usually UTC):
#   0 2 * * *    /path/to/repo/infra/cron/run-job.sh abandonment
#   0 */12 * * * /path/to/repo/infra/cron/run-job.sh cache

set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

usage() {
  echo "Usage: $0 abandonment|cache" >&2
  exit 2
}

JOB="${1:-}"
case "$JOB" in
  abandonment)
    MANAGE_ARGS=(python manage.py process_abandonment_policy)
    HEALTHCHECK_KEY=CRON_HEALTHCHECK_ABANDONMENT_URL
    ;;
  cache)
    MANAGE_ARGS=(python manage.py refresh_datastore_cache)
    HEALTHCHECK_KEY=CRON_HEALTHCHECK_CACHE_URL
    ;;
  *)
    usage
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.prod.yml"
APP_ENV_FILE="${INFRA_DIR}/../.env.production"
LOCK_FILE="${TMPDIR:-/tmp}/drt-cron-${JOB}.lock"

read_env_var() {
  local key="$1" file="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 || true)"
  [[ -n "$line" ]] || return 0
  local value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  if [[ "$value" == *" #"* ]]; then
    value="${value%% #*}"
  fi
  printf '%s' "$value"
}

PING_URL="$(read_env_var "${HEALTHCHECK_KEY}" "${APP_ENV_FILE}")"

ping_hc() {
  local url="$1"
  [[ -n "$url" ]] || return 0
  curl -fsS -m 10 --retry 5 -o /dev/null "$url" || true
}

fail_and_exit() {
  local status="$1"
  if [[ -n "${PING_URL}" ]]; then
    ping_hc "${PING_URL%/}/fail"
  fi
  exit "$status"
}

if command -v flock >/dev/null 2>&1; then
  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    echo "another ${JOB} run is in progress (${LOCK_FILE})" >&2
    fail_and_exit 1
  fi
fi

cd "${INFRA_DIR}"
set +e
docker compose -f "${COMPOSE_FILE}" exec -T backend "${MANAGE_ARGS[@]}"
status=$?
set -e

if [[ "$status" -eq 0 ]]; then
  ping_hc "${PING_URL}"
  exit 0
fi
fail_and_exit "$status"
