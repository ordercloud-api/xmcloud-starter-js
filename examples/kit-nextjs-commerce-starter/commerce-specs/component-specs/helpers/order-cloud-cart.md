---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `commerce/OrderCloudCart` (helper)

> Part of [../../index.md](../../index.md). **`OrderCloudCart` itself is not wired into `.sitecore/component-map.ts`** — it's used on a standalone `/test` page (`src/app/test/page.tsx`, not `/oc-test` as previously documented) in the source repo, not as a placeable Sitecore rendering. As of this reconciliation, `OrderCloudCart` no longer contains its own cart logic — it's a one-line wrapper around `CartPanel`, exported from `src/components/cart/Cart.tsx`. That same `CartPanel` is now also used directly by a **newly-registered** Sitecore rendering, `Cart` (`.sitecore/component-map.ts` → `'Cart'`, client), and by a static `/cart` page (`src/app/cart/page.tsx`). `Cart` has no spec of its own yet — see [Known gaps](#known-gaps).

## Summary

Renders the current anonymous session's OrderCloud cart, via the shared `CartPanel` implementation: line items, per-item quantity +/− controls, remove-item action, running total, and a "Checkout" action that redirects to a hosted checkout session.

- **Location:** `src/components/commerce/OrderCloudCart.tsx` — now just `export default function OrderCloudCart() { return <CartPanel />; }`.
- **Actual implementation:** `CartPanel` (`src/components/cart/Cart.tsx`), shared by `OrderCloudCart`, the registered `Cart` Sitecore rendering (same file, `Default` export, wraps `CartPanel` in a `<section data-component="Cart">` plus an authoring-only hint), and the static `/cart` page.
- **Rendering type:** client (`"use client"`)
- **Depends on:** `OrderCloudContext` (`useOrderCloud()` → `accessToken`, `cart`, session `status`/`error`), `lib/commerce/cart/types.ts` (`CommerceCart`), `lib/commerce/checkout/hosted.ts` (`startHostedCheckout`), `lib/commerce/checkout/status.ts` (`CHECKOUT_ORDER_ID_STORAGE_KEY`)

## Data loading

- `CartPanel` loads the cart via `cart.get()` whenever the OrderCloud session becomes `"authenticated"` or `refreshSeed` changes. Session `"loading"`/`"error"` states are surfaced directly ("Loading cart…" text / the session error message).
- `changeQuantity(lineItemId, quantity)` calls `cart.updateItem({ lineItemId, quantity })` (no-ops if `quantity < 1`) and bumps `refreshSeed` on success — quantity is now editable via per-row +/− stepper buttons, not remove-only.
- `removeItem(lineItemId)` calls `cart.removeItem(lineItemId)`, then bumps `refreshSeed`. Both `changeQuantity` and `removeItem` share one per-item `updatingId` state, disabling that row's stepper buttons and "Remove" link while in flight.

## Checkout flow (`checkout()` → `startHostedCheckout()`)

1. Requires `accessToken` to be present (throws "Unable to start checkout without a shopper session." otherwise — a defensive check; in practice `OrderCloudContext` should always have a token by the time this button is reachable).
2. `startHostedCheckout(accessToken)` (`lib/commerce/checkout/hosted.ts`) `POST`s to `/stripe/checkout` with `Authorization: Bearer {accessToken}`.
3. Expects `{ orderId?, redirectUrl }` — throws if `redirectUrl` is missing or the response isn't OK, using `result.error` or a generic `Checkout failed with {status}` message.
4. On success, stores `result.orderId` in `sessionStorage` under `CHECKOUT_ORDER_ID_STORAGE_KEY`, then navigates via `window.location.assign(result.redirectUrl)`.
5. Errors are shown inline near the Checkout button (`checkoutError` state); unlike the previous implementation, there's no manual "Open Stripe checkout" fallback link rendered while waiting for the redirect.

## Rendering

Single container: heading ("Cart" + item count when items exist); empty-cart state with a "Continue shopping" link to `/products`; otherwise an item list (name, unit price, quantity +/− stepper, line total, "Remove" action) plus a totals block (Subtotal/Tax when present, Total), a "Checkout" button (disabled while loading or starting checkout), a second "Continue shopping" link, and any checkout error.

## Known gaps

- **New, undocumented Sitecore component:** `Cart` (`src/components/cart/Cart.tsx`) is registered in `.sitecore/component-map.ts` but has no spec of its own, and no corresponding template/rendering item was found under `authoring/items/commerce` even after a fresh CLI serialization pull (see [../../templates-and-renderings.md](../../templates-and-renderings.md)) — flagged for `draft-commerce-component-spec` to pick up, and for whoever owns the live instance to confirm whether the rendering item exists elsewhere or still needs to be created.
- Checkout naming has genericized from "Stripe checkout" to "hosted checkout" in code (`startHostedCheckout`), though the underlying gateway path (`/stripe/checkout`) is still Stripe-specific — worth confirming whether multi-gateway support is actually planned or this is just a rename.
- Quantity-edit gap from the previous version of this spec is resolved: quantity is now editable in place via +/− controls.
