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
    "Brand": "$brand",
    "Category": "$category",
    "Price": $price,
    "Images": [
      {
        "Url": "$image_url",
        "Thumbnailurl": "$image_url",
        "Primary": true
      }
    ]
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

upsert_spec() {
  local product_id="$1"
  local spec_id="$2"
  local data="$3"

  echo "Upserting spec: $spec_id -> $product_id"
  oc_request "PUT" "/v1/specs/$spec_id" "$data" >/dev/null
  oc_request "POST" "/v1/specs/productassignments" "$(cat <<JSON
{
  "SpecID": "$spec_id",
  "ProductID": "$product_id"
}
JSON
)" >/dev/null
}

upsert_spec_option() {
  local spec_id="$1"
  local option_id="$2"
  local data="$3"

  oc_request "PUT" "/v1/specs/$spec_id/options/$option_id" "$data" >/dev/null
}

set_spec_default() {
  local spec_id="$1"
  local option_id="$2"

  oc_request "PATCH" "/v1/specs/$spec_id" "$(cat <<JSON
{
  "DefaultOptionID": "$option_id"
}
JSON
)" >/dev/null
}

seed_air_jordan_1_specs() {
  local product_id="aj1-love-letter-201"
  local size_spec="AJ1-LOVE-LETTER-SIZE"
  local color_spec="AJ1-LOVE-LETTER-COLORWAY"
  local fit_spec="AJ1-LOVE-LETTER-FIT"

  upsert_spec "$product_id" "$size_spec" "$(cat <<'JSON'
{
  "Name": "Men's Size",
  "ListOrder": 10,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "buttons",
      "label": "Select size",
      "helpText": "US men's sizing. Choose your usual size for a snug, true-to-size fit."
    }
  }
}
JSON
)"

  upsert_spec_option "$size_spec" "M-8" '{"Value":"M 8 / W 9.5","ListOrder":10}'
  upsert_spec_option "$size_spec" "M-8-5" '{"Value":"M 8.5 / W 10","ListOrder":20}'
  upsert_spec_option "$size_spec" "M-9" '{"Value":"M 9 / W 10.5","ListOrder":30}'
  upsert_spec_option "$size_spec" "M-9-5" '{"Value":"M 9.5 / W 11","ListOrder":40}'
  upsert_spec_option "$size_spec" "M-10" '{"Value":"M 10 / W 11.5","ListOrder":50}'
  upsert_spec_option "$size_spec" "M-10-5" '{"Value":"M 10.5 / W 12","ListOrder":60}'
  upsert_spec_option "$size_spec" "M-11" '{"Value":"M 11 / W 12.5","ListOrder":70}'
  upsert_spec_option "$size_spec" "M-12" '{"Value":"M 12 / W 13.5","ListOrder":80}'
  set_spec_default "$size_spec" "M-10"

  upsert_spec "$product_id" "$color_spec" "$(cat <<'JSON'
{
  "Name": "Colorway",
  "ListOrder": 20,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "swatches",
      "label": "Colorway",
      "helpText": "The original Love Letter palette is selected by default."
    }
  }
}
JSON
)"

  upsert_spec_option "$color_spec" "SHADOW-BROWN" "$(cat <<'JSON'
{
  "Value": "Shadow Brown/Team Red",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Shadow Brown",
      "description": "Shadow Brown, Light British Tan and Team Red",
      "color": "#59483F",
      "badge": "Shown"
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "TEAM-RED" "$(cat <<'JSON'
{
  "Value": "Team Red/Sail",
  "ListOrder": 20,
  "PriceMarkupType": "AmountTotal",
  "PriceMarkup": 10,
  "xp": {
    "presentation": {
      "label": "Team Red",
      "description": "Team Red with Sail accents",
      "color": "#9E1B32",
      "badge": "Limited"
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "SAIL" "$(cat <<'JSON'
{
  "Value": "Sail/Light British Tan",
  "ListOrder": 30,
  "xp": {
    "presentation": {
      "label": "Sail",
      "description": "Warm neutral leather and suede",
      "color": "#EEE9DA"
    }
  }
}
JSON
)"
  set_spec_default "$color_spec" "SHADOW-BROWN"

  upsert_spec "$product_id" "$fit_spec" "$(cat <<'JSON'
{
  "Name": "Fit Preference",
  "ListOrder": 30,
  "Required": false,
  "AllowOpenText": false,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "control": "radio",
      "label": "Fit preference",
      "helpText": "Optional comfort setup added for storefront testing."
    }
  }
}
JSON
)"

  upsert_spec_option "$fit_spec" "STANDARD" "$(cat <<'JSON'
{
  "Value": "Standard",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "description": "Original insole and factory lacing"
    }
  }
}
JSON
)"
  upsert_spec_option "$fit_spec" "ROOMY" "$(cat <<'JSON'
{
  "Value": "Roomy",
  "ListOrder": 20,
  "PriceMarkupType": "AmountPerQuantity",
  "PriceMarkup": 8,
  "xp": {
    "presentation": {
      "description": "Lower-profile comfort insole for extra room",
      "badge": "Wide-foot friendly"
    }
  }
}
JSON
)"
}

seed_air_force_1_by_you() {
  local product_id="air-force-1-low-by-you-900"
  local size_spec="AF1-BY-YOU-SIZE"
  local upper_spec="AF1-BY-YOU-UPPER"
  local outsole_spec="AF1-BY-YOU-OUTSOLE"
  local heel_spec="AF1-BY-YOU-HEEL"

  # Inspired by https://www.nike.com/u/custom-nike-air-force-1-low-by-you-shoes-10002304/2255384254
  upsert_product \
    "$product_id" \
    "Nike Air Force 1 Low By You" \
    "Custom men's shoes with configurable leather, outsole and personal backtab text. Style HF0659-900." \
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/6c612c89-2271-4ed1-b80c-3c2246c69bd7/AIR+FORCE+1+LOW+ESS+NBY+LEA.png" \
    "Nike" \
    "Custom Lifestyle" \
    "140.00"

  upsert_spec "$product_id" "$size_spec" "$(cat <<'JSON'
{
  "Name": "Men's Size",
  "ListOrder": 10,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "dropdown",
      "label": "Men's size",
      "helpText": "US men's sizing"
    }
  }
}
JSON
)"
  upsert_spec_option "$size_spec" "6" '{"Value":"6","ListOrder":10}'
  upsert_spec_option "$size_spec" "7" '{"Value":"7","ListOrder":20}'
  upsert_spec_option "$size_spec" "8" '{"Value":"8","ListOrder":30}'
  upsert_spec_option "$size_spec" "9" '{"Value":"9","ListOrder":40}'
  upsert_spec_option "$size_spec" "10" '{"Value":"10","ListOrder":50}'
  upsert_spec_option "$size_spec" "11" '{"Value":"11","ListOrder":60}'
  upsert_spec_option "$size_spec" "12" '{"Value":"12","ListOrder":70}'
  upsert_spec_option "$size_spec" "13" '{"Value":"13","ListOrder":80}'
  set_spec_default "$size_spec" "10"

  upsert_spec "$product_id" "$upper_spec" "$(cat <<'JSON'
{
  "Name": "Upper Material",
  "ListOrder": 20,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "cards",
      "label": "Choose your upper",
      "helpText": "Start with a classic leather base or add a premium finish."
    }
  }
}
JSON
)"
  upsert_spec_option "$upper_spec" "SMOOTH-LEATHER" "$(cat <<'JSON'
{
  "Value": "Smooth Leather",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Smooth leather",
      "description": "Clean, classic AF1 finish",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/42b73402-ca4d-4a01-8453-5f2786d4ef97/AIR+FORCE+1+LOW+ESS+NBY+LEA.png",
      "badge": "Classic"
    }
  }
}
JSON
)"
  upsert_spec_option "$upper_spec" "RIPPLED-LEATHER" "$(cat <<'JSON'
{
  "Value": "Rippled Leather",
  "ListOrder": 20,
  "PriceMarkupType": "AmountTotal",
  "PriceMarkup": 10,
  "xp": {
    "presentation": {
      "label": "Rippled leather",
      "description": "Textured premium panels",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/318da3e1-037d-4c7e-8e62-8e8679041b3c/AIR+FORCE+1+LOW+ESS+NBY+LEA.png",
      "badge": "Premium"
    }
  }
}
JSON
)"
  upsert_spec_option "$upper_spec" "CANVAS" "$(cat <<'JSON'
{
  "Value": "Canvas",
  "ListOrder": 30,
  "PriceMarkupType": "Percentage",
  "PriceMarkup": -5,
  "xp": {
    "presentation": {
      "label": "Canvas",
      "description": "Lightweight woven upper",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/9ee94934-b812-486e-a256-c386e2e243ac/AIR+FORCE+1+LOW+ESS+NBY+LEA.png"
    }
  }
}
JSON
)"
  set_spec_default "$upper_spec" "SMOOTH-LEATHER"

  upsert_spec "$product_id" "$outsole_spec" "$(cat <<'JSON'
{
  "Name": "Outsole",
  "ListOrder": 30,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "images",
      "label": "Outsole finish",
      "helpText": "Preview a traditional, gum or translucent sole."
    }
  }
}
JSON
)"
  upsert_spec_option "$outsole_spec" "SOLID" "$(cat <<'JSON'
{
  "Value": "Solid Rubber",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Solid",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/6c612c89-2271-4ed1-b80c-3c2246c69bd7/AIR+FORCE+1+LOW+ESS+NBY+LEA.png"
    }
  }
}
JSON
)"
  upsert_spec_option "$outsole_spec" "GUM" "$(cat <<'JSON'
{
  "Value": "Gum Rubber",
  "ListOrder": 20,
  "PriceMarkupType": "AmountTotal",
  "PriceMarkup": 5,
  "xp": {
    "presentation": {
      "label": "Gum",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/fcfeb3c8-63c3-4383-b022-ce3a91332f6d/AIR+FORCE+1+LOW+ESS+NBY+LEA.png",
      "badge": "Heritage"
    }
  }
}
JSON
)"
  upsert_spec_option "$outsole_spec" "TRANSLUCENT" "$(cat <<'JSON'
{
  "Value": "Translucent Rubber",
  "ListOrder": 30,
  "PriceMarkupType": "AmountTotal",
  "PriceMarkup": 8,
  "xp": {
    "presentation": {
      "label": "Translucent",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/122acb83-0f2c-4c2d-89cd-e81ae9cd3b7a/AIR+FORCE+1+LOW+ESS+NBY+LEA.png"
    }
  }
}
JSON
)"
  set_spec_default "$outsole_spec" "SOLID"

  upsert_spec "$product_id" "$heel_spec" "$(cat <<'JSON'
{
  "Name": "Heel Detail",
  "ListOrder": 40,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "control": "buttons",
      "textControl": "text",
      "label": "Backtab detail",
      "helpText": "Choose the classic Nike Air logo or enter up to 3 characters.",
      "placeholder": "ABC",
      "suffix": "3 characters max"
    },
    "validation": {
      "minLength": 1,
      "maxLength": 3
    }
  }
}
JSON
)"
  upsert_spec_option "$heel_spec" "NIKE-AIR" "$(cat <<'JSON'
{
  "Value": "Nike Air Logo",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Nike Air",
      "description": "Classic embroidered backtab"
    }
  }
}
JSON
)"
  upsert_spec_option "$heel_spec" "CUSTOM-TEXT" "$(cat <<'JSON'
{
  "Value": "Custom Text",
  "ListOrder": 20,
  "IsOpenText": true,
  "PriceMarkupType": "AmountTotal",
  "PriceMarkup": 8,
  "xp": {
    "presentation": {
      "label": "Your text",
      "description": "Personalized embroidery",
      "badge": "Make it yours"
    }
  }
}
JSON
)"
  set_spec_default "$heel_spec" "NIKE-AIR"
}

seed_personalized_running_top() {
  local product_id="dri-fit-running-top-254"
  local size_spec="DRI-FIT-TOP-SIZE"
  local name_spec="DRI-FIT-TOP-RUNNER-NAME"
  local number_spec="DRI-FIT-TOP-RACE-NUMBER"
  local note_spec="DRI-FIT-TOP-TRAINING-NOTE"
  local date_spec="DRI-FIT-TOP-EVENT-DATE"

  # Inspired by https://www.nike.com/t/mens-dri-fit-short-sleeve-running-top-8bL866ST/IU8957-254
  upsert_product \
    "$product_id" \
    "Nike Dri-FIT Run Club Top" \
    "Roomy short-sleeve running top in sweat-wicking recycled polyester, adapted with optional run-club personalization. Medium Ash/Black. Style IU8957-254." \
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/0f244bfd-22f8-40d4-9625-85b03b5cdce0/M+NK+DF+INL+DSRPT+SS+TOP.png" \
    "Nike" \
    "Running Apparel" \
    "75.00"

  upsert_spec "$product_id" "$size_spec" "$(cat <<'JSON'
{
  "Name": "Size",
  "ListOrder": 10,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "buttons",
      "label": "Select size",
      "helpText": "Roomy, boxy fit. Choose your usual Nike apparel size."
    }
  }
}
JSON
)"
  upsert_spec_option "$size_spec" "XS" '{"Value":"XS","ListOrder":10}'
  upsert_spec_option "$size_spec" "S" '{"Value":"S","ListOrder":20}'
  upsert_spec_option "$size_spec" "M" '{"Value":"M","ListOrder":30}'
  upsert_spec_option "$size_spec" "L" '{"Value":"L","ListOrder":40}'
  upsert_spec_option "$size_spec" "XL" '{"Value":"XL","ListOrder":50}'
  upsert_spec_option "$size_spec" "XXL" '{"Value":"XXL","ListOrder":60}'
  upsert_spec_option "$size_spec" "3XL" '{"Value":"3XL","ListOrder":70}'
  upsert_spec_option "$size_spec" "4XL" '{"Value":"4XL","ListOrder":80}'
  set_spec_default "$size_spec" "M"

  upsert_spec "$product_id" "$name_spec" "$(cat <<'JSON'
{
  "Name": "Runner Name",
  "ListOrder": 20,
  "Required": false,
  "AllowOpenText": true,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "textControl": "text",
      "label": "Runner name",
      "helpText": "Optional name printed across the upper back.",
      "placeholder": "MORGAN",
      "prefix": "Name"
    },
    "validation": {
      "minLength": 2,
      "maxLength": 12
    }
  }
}
JSON
)"

  upsert_spec "$product_id" "$number_spec" "$(cat <<'JSON'
{
  "Name": "Race Number",
  "ListOrder": 30,
  "Required": false,
  "AllowOpenText": true,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "textControl": "number",
      "label": "Race number",
      "helpText": "Optional whole number printed below the runner name.",
      "placeholder": "26",
      "prefix": "#"
    },
    "validation": {
      "min": 1,
      "max": 999,
      "step": 1
    }
  }
}
JSON
)"

  upsert_spec "$product_id" "$note_spec" "$(cat <<'JSON'
{
  "Name": "Print Notes",
  "ListOrder": 40,
  "Required": false,
  "AllowOpenText": true,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "textControl": "textarea",
      "label": "Print notes",
      "helpText": "Optional placement or capitalization notes for the print team.",
      "placeholder": "Use all caps and center the name above the number."
    },
    "validation": {
      "maxLength": 120
    }
  }
}
JSON
)"

  upsert_spec "$product_id" "$date_spec" "$(cat <<'JSON'
{
  "Name": "Event Date",
  "ListOrder": 50,
  "Required": false,
  "AllowOpenText": true,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "textControl": "date",
      "label": "Event date",
      "helpText": "Optional. Helps the print team prioritize upcoming races.",
      "suffix": "race day"
    },
    "validation": {
      "minDate": "today",
      "maxDate": "2028-12-31"
    }
  }
}
JSON
)"
}

seed_brasilia_duffel() {
  local product_id="brasilia-duffel-40l-459"
  local color_spec="BRASILIA-40L-COLOR"
  local strap_spec="BRASILIA-40L-STRAP"
  local monogram_spec="BRASILIA-40L-MONOGRAM"

  # Inspired by https://www.nike.com/t/brasilia-training-duffel-bag-small-40l-2pYWTjne/IB4394-459
  upsert_product \
    "$product_id" \
    "Nike Brasilia Training Duffel Bag" \
    "Small 40L training duffel with multiple pockets, a ventilated side compartment and adjustable carry options. Style IB4394-459." \
    "https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto,u_9ddf04c7-2a9a-4d76-add1-d15af8f0263d,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/0f19029b-8b90-4f60-9016-1009b5cd66bf/NK+BRSLA+S+DUFF+-+X.png" \
    "Nike" \
    "Training Accessories" \
    "45.00"

  upsert_spec "$product_id" "$color_spec" "$(cat <<'JSON'
{
  "Name": "Color",
  "ListOrder": 10,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": true,
  "xp": {
    "presentation": {
      "control": "swatches",
      "label": "Bag color",
      "helpText": "Choose from current Nike Brasilia-inspired colors."
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "INDIGO-STORM" "$(cat <<'JSON'
{
  "Value": "Indigo Storm/Black",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Indigo Storm",
      "color": "#31566F",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/85af0ecb-90e6-4705-996b-7371032179f8/NK+BRSLA+S+DUFF+-+X.png",
      "badge": "Shown"
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "BLACK" "$(cat <<'JSON'
{
  "Value": "Black/Black/White",
  "ListOrder": 20,
  "xp": {
    "presentation": {
      "label": "Black",
      "color": "#111111",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/8447ce0a-4fe3-4112-ae1a-3dbe438f7f5c/NK+BRSLA+S+DUFF+-+X.png",
      "badge": "Best seller"
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "GAME-ROYAL" "$(cat <<'JSON'
{
  "Value": "Game Royal/Black/White",
  "ListOrder": 30,
  "xp": {
    "presentation": {
      "label": "Game Royal",
      "color": "#1D4E9E",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/cb76bdfc-bec3-4b81-a382-e31f7200cb61/NK+BRSLA+S+DUFF+-+X.png"
    }
  }
}
JSON
)"
  upsert_spec_option "$color_spec" "LIGHT-MAGENTA" "$(cat <<'JSON'
{
  "Value": "Light Magenta/Black",
  "ListOrder": 40,
  "xp": {
    "presentation": {
      "label": "Light Magenta",
      "color": "#D96C9D",
      "imageUrl": "https://static.nike.com/a/images/t_PDP_144_v1/f_auto,q_auto:eco/b9e3968e-4ef1-49ae-b652-74fec933d097/NK+BRSLA+S+DUFF+-+X.png"
    }
  }
}
JSON
)"
  set_spec_default "$color_spec" "INDIGO-STORM"

  upsert_spec "$product_id" "$strap_spec" "$(cat <<'JSON'
{
  "Name": "Shoulder Strap",
  "ListOrder": 20,
  "Required": true,
  "AllowOpenText": false,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "control": "cards",
      "label": "Shoulder strap",
      "helpText": "Choose the standard webbing strap or add extra padding."
    }
  }
}
JSON
)"
  upsert_spec_option "$strap_spec" "STANDARD" "$(cat <<'JSON'
{
  "Value": "Standard Strap",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "Standard",
      "description": "Adjustable woven strap included with the bag"
    }
  }
}
JSON
)"
  upsert_spec_option "$strap_spec" "PADDED" "$(cat <<'JSON'
{
  "Value": "Padded Strap",
  "ListOrder": 20,
  "PriceMarkupType": "AmountPerQuantity",
  "PriceMarkup": 6,
  "xp": {
    "presentation": {
      "label": "Extra padded",
      "description": "Removable shoulder pad for heavier loads",
      "badge": "Comfort"
    }
  }
}
JSON
)"
  set_spec_default "$strap_spec" "STANDARD"

  upsert_spec "$product_id" "$monogram_spec" "$(cat <<'JSON'
{
  "Name": "Monogram",
  "ListOrder": 30,
  "Required": false,
  "AllowOpenText": false,
  "DefinesVariant": false,
  "xp": {
    "presentation": {
      "control": "radio",
      "textControl": "text",
      "label": "Monogram",
      "helpText": "Optional embroidered initials on the end panel.",
      "placeholder": "MVP",
      "prefix": "Initials",
      "suffix": "up to 8 characters"
    },
    "validation": {
      "minLength": 2,
      "maxLength": 8
    }
  }
}
JSON
)"
  upsert_spec_option "$monogram_spec" "NO-MONOGRAM" "$(cat <<'JSON'
{
  "Value": "No Monogram",
  "ListOrder": 10,
  "xp": {
    "presentation": {
      "label": "No monogram"
    }
  }
}
JSON
)"
  upsert_spec_option "$monogram_spec" "CUSTOM-MONOGRAM" "$(cat <<'JSON'
{
  "Value": "Custom Monogram",
  "ListOrder": 20,
  "IsOpenText": true,
  "PriceMarkupType": "AmountPerQuantity",
  "PriceMarkup": 12,
  "xp": {
    "presentation": {
      "label": "Add a monogram",
      "description": "Tone-on-tone embroidery",
      "badge": "Personalized"
    }
  }
}
JSON
)"
  set_spec_default "$monogram_spec" "NO-MONOGRAM"
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

  seed_air_jordan_1_specs

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

  seed_air_force_1_by_you
  seed_personalized_running_top
  seed_brasilia_duffel

  echo "Seed complete. Catalog: $CATALOG_ID, Category: $ROOT_CATEGORY_ID"
}

main
