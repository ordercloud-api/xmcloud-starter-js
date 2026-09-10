#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://sandboxapi.ordercloud.io}"
CATALOG_ID="${CATALOG_ID:-xmc-local-catalog}"
CATALOG_NAME="${CATALOG_NAME:-XM Cloud Local Catalog}"
ROOT_CATEGORY_ID="${ROOT_CATEGORY_ID:-xmc-local-products}"
ROOT_CATEGORY_NAME="${ROOT_CATEGORY_NAME:-XM Cloud Products}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "${TOKEN:-}" ]]; then
  echo "Missing TOKEN."
  echo "Example: TOKEN=\"\$(/Users/ersi/Devtop/sitecore.ep.proxy.oc-storefront/get-oc-token.sh)\" bash scripts/seed-oc-catalog.sh"
  exit 1
fi

oc_request() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] $method $API_BASE_URL$path"
    if [[ -n "$data" ]]; then
      echo "$data" | sed 's/^/[DRY_RUN] body: /'
    fi
    return 0
  fi

  local response
  local body
  local status

  if [[ -n "$data" ]]; then
    response="$(curl -sS -w '\n%{http_code}' -X "$method" "$API_BASE_URL$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data-raw "$data")"
  else
    response="$(curl -sS -w '\n%{http_code}' -X "$method" "$API_BASE_URL$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")"
  fi

  status="$(echo "$response" | tail -n1)"
  body="$(echo "$response" | sed '$d')"

  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "OrderCloud API error: $method $path -> $status"
    echo "$body"
    exit 1
  fi

  echo "$body"
}

create_catalog_and_category() {
  echo "Seeding catalog $CATALOG_ID and root category $ROOT_CATEGORY_ID..."

  oc_request "PUT" "/v1/catalogs/$CATALOG_ID" "$(cat <<JSON
{
  "ID": "$CATALOG_ID",
  "Name": "$CATALOG_NAME",
  "Description": "Catalog for XM Cloud local product-listing testing",
  "Active": true
}
JSON
)" >/dev/null

  oc_request "PUT" "/v1/categories/$ROOT_CATEGORY_ID" "$(cat <<JSON
{
  "ID": "$ROOT_CATEGORY_ID",
  "Name": "$ROOT_CATEGORY_NAME",
  "Description": "Root category for local XM Cloud demo products",
  "Active": true
}
JSON
)" >/dev/null
}

upsert_product() {
  local product_id="$1"
  local name="$2"
  local description="$3"
  local image_url="$4"
  local brand="$5"
  local category="$6"
  local price="$7"

  local price_schedule_id="${product_id}-ps"

  echo "Upserting product: $product_id"

  oc_request "PUT" "/v1/products/$product_id" "$(cat <<JSON
{
  "ID": "$product_id",
  "Name": "$name",
  "Description": "$description",
  "Active": true,
  "xp": {
    "imageUrl": "$image_url",
    "brand": "$brand",
    "category": "$category",
    "price": $price
  }
}
JSON
)" >/dev/null

  oc_request "PUT" "/v1/priceschedules/$price_schedule_id" "$(cat <<JSON
{
  "ID": "$price_schedule_id",
  "Name": "$name Price",
  "ApplyTax": false,
  "UseCumulativeQuantity": false,
  "RestrictedQuantity": false,
  "MinQuantity": 1,
  "MaxQuantity": null,
  "PriceBreaks": [
    {
      "Quantity": 1,
      "Price": $price
    }
  ]
}
JSON
)" >/dev/null

  oc_request "PATCH" "/v1/products/$product_id" "$(cat <<JSON
{
  "DefaultPriceScheduleID": "$price_schedule_id"
}
JSON
)" >/dev/null

  # Create assignment for this catalog/category/product. Treat conflict as success on reruns.
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[DRY_RUN] POST /v1/catalogs/$CATALOG_ID/assignments"
  else
    assignment_response="$(curl -sS -w '\n%{http_code}' -X POST "$API_BASE_URL/v1/catalogs/$CATALOG_ID/assignments" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data-raw "$(cat <<JSON
{
  \"CategoryID\": \"$ROOT_CATEGORY_ID\",
  \"ProductID\": \"$product_id\"
}
JSON
)")"
    assignment_status="$(echo "$assignment_response" | tail -n1)"
    assignment_body="$(echo "$assignment_response" | sed '$d')"
    if [[ "$assignment_status" != "201" && "$assignment_status" != "200" && "$assignment_status" != "409" ]]; then
      echo "Assignment error for $product_id -> $assignment_status"
      echo "$assignment_body"
      exit 1
    fi
  fi
}

main() {
  create_catalog_and_category

  upsert_product \
    "aj1-love-letter-201" \
    "Air Jordan 1 Retro High OG Love Letter" \
    "High-top heritage silhouette in nubuck leather and suede, Shadow Brown/Light British Tan/Team Red colorway. Style DZ5485-201." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/ba9f162a-46d1-4ba9-a321-3c267773fb51/AIR+JORDAN+1+RETRO+HIGH+OG.png" \
    "Jordan" \
    "Basketball Lifestyle" \
    "185.00"

  upsert_product \
    "ava-edge-001" \
    "Nike Ava Edge" \
    "Lifestyle sneaker with a woven/mesh upper and oversized SCF foam midsole, built for city wear. Wolf Grey/Racer Blue/Vast Grey. Style IM1973-001." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/89ae04bf-6320-42c4-8ebd-aa5575bc0c80/NIKE+AVA+EDGE.png" \
    "Nike" \
    "Lifestyle" \
    "155.00"

  upsert_product \
    "air-max-90-317" \
    "Nike Air Max 90" \
    "Classic 90s running-inspired silhouette with Waffle outsole and visible Max Air cushioning. Black Spruce/Vintage Green/Fir/Summit White. Style IX4089-317." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/5ae089bf-92f4-48fb-8ca7-eac10bce4faf/AIR+MAX+90.png" \
    "Nike" \
    "Lifestyle" \
    "135.00"

  upsert_product \
    "vomero-premium-200" \
    "Nike Vomero Premium" \
    "Max-cushioned road running shoe with dual Air Zoom units and a full-length ZoomX midsole. Desert Khaki/Light Khaki/Coconut Milk/Reflect Silver. Style IM8334-200." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/9495e99e-3613-435d-a002-fca8f2bde5cd/NIKE+VOMERO+PREMIUM+ESS.png" \
    "Nike" \
    "Running" \
    "230.00"

  upsert_product \
    "free-metcon-7-amp-001" \
    "Nike Free Metcon 7 AMP" \
    "Versatile training shoe with Nike Free flex zones, webbed midfoot lacing, and a durable rubber outsole for multi-surface traction. Black/Hyper Punch/Indigo Burst/Metallic Platinum. Style IR0278-001." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/b2c4690c-2fe3-4be6-bc6f-eb0cfb9dfe3c/NIKE+FREE+METCON+7+AMP.png" \
    "Nike" \
    "Training" \
    "135.00"

  upsert_product \
    "jordan-heir-2-birds-001" \
    "Jordan Heir Series 2 Birds of Paradise" \
    "WNBA-inspired basketball shoe with a translucent netted outsole, external support cage, and a detachable heel hairband. Black/Metallic Gold/Total Orange/Coconut Milk. Style II0568-001." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/1302fc55-cbdf-41d2-996b-43bf86136228/WMNS+JORDAN+HEIR+SERIES+2+WNBA.png" \
    "Jordan" \
    "Basketball" \
    "120.00"

  upsert_product \
    "book-2-tiger-camo-001" \
    "Book 2 Tiger Camo" \
    "Signature basketball shoe with an all-over tiger camo print, forefoot Air Zoom unit, and herringbone traction pattern. Black/Total Orange/Flax/Black. Style IM4669-001." \
    "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco,c_scale,w_300,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/f19e2d24-ce77-40d9-9e73-87fd347fb861/BOOK+2+CAMO.png" \
    "Jordan" \
    "Basketball" \
    "145.00"

  echo "Seed complete. Catalog: $CATALOG_ID, Category: $ROOT_CATEGORY_ID"
}

main