#!/usr/bin/env bash

set -euo pipefail

APP_URL="${APP_URL:-http://127.0.0.1:3000}"
OC_API_URL="${OC_API_URL:-https://sandboxapi.ordercloud.io}"

title() {
  printf '\n== %s ==\n' "$1"
}

status_only() {
  curl -sS -o /dev/null -w '%{http_code}' "$1"
}

title "Inputs"
echo "APP_URL=$APP_URL"
echo "OC_API_URL=$OC_API_URL"

title "Storefront"
echo "app_status=$(status_only "$APP_URL" || true)"
echo "diagnostics_status=$(status_only "$APP_URL/test" || true)"

title "Next Step"
echo "Open $APP_URL/test and verify anonymous auth, products, and cart target $OC_API_URL directly."
