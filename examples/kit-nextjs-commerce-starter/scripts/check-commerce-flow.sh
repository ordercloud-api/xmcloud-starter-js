#!/usr/bin/env bash

set -euo pipefail

APP_URL="${APP_URL:-http://127.0.0.1:3000}"
PROXY_URL="${PROXY_URL:-http://127.0.0.1:8795}"

title() {
  printf '\n== %s ==\n' "$1"
}

status_only() {
  curl -sS -o /dev/null -w '%{http_code}' "$1"
}

title "Inputs"
echo "APP_URL=$APP_URL"
echo "PROXY_URL=$PROXY_URL"

title "Proxy Health"
echo "proxy_health_status=$(status_only "$PROXY_URL/health" || true)"

title "Storefront"
echo "app_status=$(status_only "$APP_URL" || true)"

title "Browser CORS Preflight"
curl -sS -i -X OPTIONS "$PROXY_URL/oc/oauth/token" \
  -H "Origin: $APP_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" | sed -n '1,20p'

title "Next Step"
echo "Open $APP_URL and verify OAuth, product, and cart requests target $PROXY_URL/oc directly."
