---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `AddToCart`

> Part of [../index.md](../index.md). Must be rendered inside a [ProductContainer](product-container.md) — reads Content SDK product/selection state and the thin starter cart adapter.

## Summary

Client leaf component rendering a quantity input and "Add to cart" submit button. Like [ProductInfo](product-info.md) and [SpecForm](spec-form.md), has no Sitecore-authored fields of its own (no Datasource Template on the `AddToCart` rendering item).

- **Location:** `src/components/add-to-cart/AddToCart.tsx`
- **Rendering type:** client (`"use client"`)
- **Variants:** `Default` only
- **Registered as:** `AddToCart` in `.sitecore/component-map.ts` (client map)
- **Depends on:** SDK `useProduct()`, `useProductOptions()`, `useProductSelection()` and `OrderCloudContext.cart`, which routes writes through `OrderCloudService.request()`.

## Local state

| State | Purpose |
|---|---|
| `quantity` (`string`, default `"1"`) | Controlled value of the quantity `<input type="number">`. |
| `quantityError` (`string \| null`) | Set when quantity isn't a positive integer. |
| `submissionStatus` (`"idle" \| "adding" \| "added" \| "error"`) | Drives button label/disabled state and the result message. |
| `submissionMessage` (`string \| null`) | Success or error text shown after submit. |

Two effects reset local state when the product ID or SDK selections change.

## Submit flow (`submit`)

1. Guards: no selection provider, product ID/cart, options not ready, or editing/preview mode.
2. Calls SDK `selection.validate()` and `selection.getLineItemDraft()`.
3. Validates quantity is a positive integer (`Number.isInteger(...) && >= 1`); sets `quantityError` if not.
4. If there are spec errors → `submissionStatus = "error"`, message "Select the required product options.", return (without checking quantity further).
5. If quantity invalid → return silently (the `quantityError` message is already shown near the input).
6. Otherwise `submissionStatus = "adding"`, then calls:
   ```ts
   await cart.addItem({
     productId,
     quantity: normalizedQuantity,
     specs: draft.Specs,
   });
   ```
   The SDK owns default selection, variant resolution, issue generation and line-item-spec conversion.
7. A 409 resets the SDK anonymous session once and retries; other errors surface. No cart deletion occurs during recovery.
8. On success: `submissionStatus = "added"`, message "Added to cart".

## Rendering states

Same status-driven pattern as [ProductInfo](product-info.md):

| `productData` / `status` | Rendering |
|---|---|
| Hook state `null` | Authoring: "AddToCart must be placed inside a ProductContainer." Live: nothing. |
| Product `"loading"` | Skeleton. |
| Product `"idle"` / `"not-found"` / `"error"` | Authoring-only message box. |
| Product `"success"` | Full form. |

## Ready-state form

- `<form onSubmit={submit} noValidate>` with `data-component="AddToCart"`, `params.styles`, `params.RenderingIdentifier`.
- Quantity `<input type="number" min={1} step={1}>`; on change, clears `quantityError` and resets `submissionStatus`/`submissionMessage` back to idle so a fresh edit doesn't show stale success/error text. `aria-describedby="product-quantity-error"` when there's a quantity error; the error itself is `role="alert"`.
- Submit button is disabled while selection is incomplete, authoring/preview is active, or submission is in progress.
- Result message: green/emerald text with `role="status"` on success, red text with `role="alert"` on error. On success only, the message also includes a `View cart` link (`next/link` to `/cart`, the static cart page — see [OrderCloudCart](helpers/order-cloud-cart.md)).

## Known gaps

- No optimistic cart-count update or visible cart summary from `AddToCart` itself — it only reports local add/error status. Any cart badge/mini-cart would need to independently re-fetch (see [OrderCloudCart](helpers/order-cloud-cart.md), which is not currently wired to react to `AddToCart` submissions).
- Quantity input has no `max` — worth deciding whether a stock/inventory ceiling should be enforced client-side or left entirely to the cart API response.
