#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"

APP_URL="${APP_URL:-http://127.0.0.1:3000}"
APP_HEALTH_URL="${APP_HEALTH_URL:-$APP_URL/test}"
PROXY_URL="${PROXY_URL:-http://127.0.0.1:8795}"
APP_PORT="${APP_PORT:-3000}"
PROXY_PORT="${PROXY_PORT:-8795}"
PROXY_DIR="${PROXY_DIR:-/Users/ersi/Devtop/sitecore.ep.proxy.oc-storefront}"
WAIT_SECONDS="${WAIT_SECONDS:-45}"

mkdir -p "$LOG_DIR"

port_up() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

start_proxy() {
  if port_up "$PROXY_PORT"; then
    echo "proxy already listening on :$PROXY_PORT"
    return 0
  fi

  echo "starting proxy on :$PROXY_PORT"
  nohup /usr/bin/env -C "$PROXY_DIR" pnpm exec wrangler dev --config wrangler.local.toml --local --port "$PROXY_PORT" >"$LOG_DIR/proxy.log" 2>&1 &
  echo "$!" >"$LOG_DIR/proxy.pid"
}

start_app() {
  if port_up "$APP_PORT"; then
    echo "app already listening on :$APP_PORT"
    return 0
  fi

  echo "starting app on :$APP_PORT"
  nohup /usr/bin/env -C "$ROOT_DIR" NEXT_PUBLIC_ORDERCLOUD_PROXY_URL="$PROXY_URL/oc" npm run dev >"$LOG_DIR/app.log" 2>&1 &
  echo "$!" >"$LOG_DIR/app.pid"
}

wait_ready() {
  local end=$((SECONDS + WAIT_SECONDS))
  local proxy_ok=0
  local app_ok=0

  while ((SECONDS < end)); do
    proxy_ok=0
    app_ok=0

    if curl -sS "$PROXY_URL/health" >/dev/null 2>&1; then
      proxy_ok=1
    fi

    if curl -sS "$APP_HEALTH_URL" >/dev/null 2>&1; then
      app_ok=1
    fi

    if [[ "$proxy_ok" == "1" && "$app_ok" == "1" ]]; then
      echo "proxy + app ready"
      return 0
    fi

    sleep 1
  done

  echo "timed out waiting for readiness"
  echo "proxy log: $LOG_DIR/proxy.log"
  echo "app log: $LOG_DIR/app.log"
  return 1
}

echo "root: $ROOT_DIR"
echo "proxy dir: $PROXY_DIR"
echo "app health url: $APP_HEALTH_URL"

start_proxy
start_app

if wait_ready; then
  /usr/bin/env -C "$ROOT_DIR" npm run commerce:check
else
  echo "readiness failed. inspect logs and rerun."
fi
