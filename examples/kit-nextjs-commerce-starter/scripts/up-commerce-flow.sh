#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"

APP_URL="${APP_URL:-http://127.0.0.1:3000}"
APP_HEALTH_URL="${APP_HEALTH_URL:-$APP_URL/test}"
APP_PORT="${APP_PORT:-3000}"
WAIT_SECONDS="${WAIT_SECONDS:-45}"

mkdir -p "$LOG_DIR"

port_up() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

start_app() {
  if port_up "$APP_PORT"; then
    echo "app already listening on :$APP_PORT"
    return 0
  fi

  echo "starting app on :$APP_PORT"
  nohup /usr/bin/env -C "$ROOT_DIR" npm run dev >"$LOG_DIR/app.log" 2>&1 &
  echo "$!" >"$LOG_DIR/app.pid"
}

wait_ready() {
  local end=$((SECONDS + WAIT_SECONDS))
  local app_ok=0

  while ((SECONDS < end)); do
    app_ok=0

    if curl -sS "$APP_HEALTH_URL" >/dev/null 2>&1; then
      app_ok=1
    fi

    if [[ "$app_ok" == "1" ]]; then
      echo "app ready"
      return 0
    fi

    sleep 1
  done

  echo "timed out waiting for readiness"
  echo "app log: $LOG_DIR/app.log"
  return 1
}

echo "root: $ROOT_DIR"
echo "app health url: $APP_HEALTH_URL"

start_app

if wait_ready; then
  /usr/bin/env -C "$ROOT_DIR" npm run commerce:check
else
  echo "readiness failed. inspect logs and rerun."
fi
