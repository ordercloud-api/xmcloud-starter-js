---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `AddToCart`

> Part of [../index.md](../index.md). Must be rendered inside a [ProductContainer](product-container.md) — reads product/spec state from `ProductDataContext` and cart operations from `OrderCloudContext`.

## Summary

Client leaf component rendering a quantity input and "Add to cart" submit button. Like [ProductInfo](product-info.md) and [SpecForm](spec-form.md), has no Sitecore-authored fields of its own (no Datasource Template on the `AddToCart` rendering item).

- **Location:** `src/components/add-to-cart/AddToCart.tsx`
- **Rendering type:** client (`"use client"`)
- **Variants:** `Default` only
- **Registered as:** `AddToCart` in `.sitecore/component-map.ts` (client map)
- **Depends on:** `ProductDataContext` (`useProductContext()`), `OrderCloudContext` (`useOrderCloud()` → `cart.addItem`), `lib/commerce/products/specs.ts` (`toLineItemSpecs`, `validateSpecSelections`)

## Local state

| State | Purpose |
|---|---|
| `quantity` (`string`, default `"1"`) | Controlled value of the quantity `<input type="number">`. |
| `quantityError` (`string \| null`) | Set when quantity isn't a positive integer. |
| `submissionStatus` (`"idle" \| "adding" \| "added" \| "error"`) | Drives button label/disabled state and the result message. |
| `submissionMessage` (`string \| null`) | Success or error text shown after submit. |

Two effects reset local state: when `productData.productId` changes (new product loaded — resets quantity/errors/submission), and when `productData?.selections` changes (any spec selection change clears the previous submission result).

## Submit flow (`submit`)

1. Guards: no-op if `!productData`, no `productId`, or `productData.specsStatus !== "ready"`.
2. Revalidates specs via `validateSpecSelections(productData.specs, productData.selections)` and pushes the result into `productData.setValidationErrors(...)` — this is a **second** validation pass in addition to the `areSpecSelectionsValid` flag already gating the submit button (defense in depth against stale/disabled-state edge cases).
3. Validates quantity is a positive integer (`Number.isInteger(...) && >= 1`); sets `quantityError` if not.
4. If there are spec errors → `submissionStatus = "error"`, message "Select the required product options.", return (without checking quantity further).
5. If quantity invalid → return silently (the `quantityError` message is already shown near the input).
6. Otherwise `submissionStatus = "adding"`, then calls:
   ```ts
   await cart.addItem({
     productId,
     quantity: normalizedQuantity,
     specs: toLineItemSpecs(productData.specs, productData.selections),
   });
   ```
   `toLineItemSpecs()` (`lib/commerce/products/specs.ts`) converts the in-memory `ProductSpecSelections` map into the `LineItemSpec[]` shape OrderCloud's cart API expects.
7. On success: `submissionStatus = "added"`, message "Added to cart". On failure: `submissionStatus = "error"`, message from `error.message` or a generic fallback.

## Rendering states

Same status-driven pattern as [ProductInfo](product-info.md):

| `productData` / `status` | Rendering |
|---|---|
| `null` | Authoring: "AddToCart must be placed inside a ProductContainer." Live: nothing. |
| `"loading-session"` / `"loading-product"` | Skeleton: `h-12 w-36 animate-pulse` block, `aria-live="polite"`, screen-reader "Loading add to cart…". |
| `"configuration-error"` / `"not-found"` / `"error"` | Authoring-only message box (same three-way message logic as `ProductInfo`/`SpecForm`). Live: nothing. |
| `"ready"` | Full `<form>` (below). |

## Ready-state form

- `<form onSubmit={submit} noValidate>` with `data-component="AddToCart"`, `params.styles`, `params.RenderingIdentifier`.
- Quantity `<input type="number" min={1} step={1}>`; on change, clears `quantityError` and resets `submissionStatus`/`submissionMessage` back to idle so a fresh edit doesn't show stale success/error text. `aria-describedby="product-quantity-error"` when there's a quantity error; the error itself is `role="alert"`.
- Submit button: `disabled={!productData.areSpecSelectionsValid || submissionStatus === "adding"}` — **this is the primary spec-validation gate**; the in-`submit` revalidation (step 2 above) is a secondary safety net. Label switches to "Adding…" while `submissionStatus === "adding"`.
- Result message: green/emerald text with `role="status"` on success, red text with `role="alert"` on error. On success only, the message also includes a `View cart` link (`next/link` to `/cart`, the static cart page — see [OrderCloudCart](helpers/order-cloud-cart.md)).

## Known gaps

- No optimistic cart-count update or visible cart summary from `AddToCart` itself — it only reports local add/error status. Any cart badge/mini-cart would need to independently re-fetch (see [OrderCloudCart](helpers/order-cloud-cart.md), which is not currently wired to react to `AddToCart` submissions).
- Quantity input has no `max` — worth deciding whether a stock/inventory ceiling should be enforced client-side or left entirely to the cart API response.
