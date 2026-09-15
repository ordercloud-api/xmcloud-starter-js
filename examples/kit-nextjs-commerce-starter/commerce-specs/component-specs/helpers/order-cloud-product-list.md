---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `commerce/OrderCloudProductList` (helper)

> Part of [../../index.md](../../index.md). Not independently registered in `.sitecore/component-map.ts` — used by [../product-listing.md](../product-listing.md) for its `"ordercloud-catalog"` and `"ordercloud-picker"` branches.

## Summary

Client component that fetches and renders a grid of OrderCloud products, either a live catalog page or a fixed set of picked product IDs, with loading/retry/error/empty handling and a shared 10s request timeout.

- **Location:** `src/components/commerce/OrderCloudProductList.tsx` (default export)
- **Rendering type:** client (`"use client"`)
- **Depends on:** `OrderCloudContext` (`useOrderCloud()` → `products` service, session `status`/`error`), `RoutePathContext` (`useRoutePath()`), `usePathname()` (`next/navigation`), `lib/commerce/products/href.ts` (`buildProductDetailHref`, `resolveProductListDetailPageHref`), [`OrderCloudProductCard`](order-cloud-product-card.md)

## Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `title` | `string` | `"OrderCloud products"` | Section heading. |
| `compact` | `boolean` | `false` | Passed through to `OrderCloudProductCard` (denser card layout, hides ID/description). |
| `source` | `ProductListSource` (`"ordercloud-catalog" \| "ordercloud-picker" \| "sitecore"`) | `"ordercloud-catalog"` | Only `"ordercloud-catalog"` and `"ordercloud-picker"` are meaningful here — `ProductListing` never passes `"sitecore"` to this component. |
| `productIds` | `string[]` | `[]` | Required (non-empty) when `source === "ordercloud-picker"`. |
| `detailPageHref` | `string` | — | Author-configured base href for product detail links; see [href resolution](#detail-page-href-resolution). |
| `isAuthoring` | `boolean` | `false` | Suppresses hint messages appropriately for live vs. authoring context. |

## Data loading

- `selectedIds = productIds.map(trim).filter(Boolean)`; `isPickerList = source === "ordercloud-picker"`; `hasPickerSelection = selectedIds.length > 0`.
- If picker mode with no selected IDs: skip fetching entirely, show an empty/hint state (no network call).
- If the OrderCloud session (`useOrderCloud().status`) isn't `"authenticated"` yet: shows loading or the session error, no product fetch attempted.
- Otherwise fetches via `productsService.listByIds(ids, { signal })` (picker mode) or `productsService.list({ signal })` (catalog mode), both `AbortController`-scoped.
- **10-second timeout** (`REQUEST_TIMEOUT_MS = 10_000`): a `window.setTimeout` aborts the controller if the request hasn't resolved; a `timedOut` flag distinguishes a timeout-abort from a user-triggered retry-abort (via `refreshSeed`) so the error message can be specific: `` `Product request timed out after 10s. Check proxy/auth and try again.` ``. If the abort was **not** a timeout (i.e. effect cleanup from a `refreshSeed` change or unmount), the catch silently returns without setting an error.
- "Retry" button increments `refreshSeed`, which re-runs the effect (also used to eventually pick up a newly-authenticated session).

## Rendering states

- Loading: "Loading product data..."; error (non-loading): the error message in red.
- Authoring hint if `!resolvedDetailPageHref`: "Configure Detail Page so product cards can link to the product detail page."
- Picker mode with no selection: authoring hint to select products or switch source; live: "No OrderCloud products selected for this listing."
- Loaded but empty (and not the no-selection picker case): "No products returned from OrderCloud." (amber)
- Loaded with items: 2/3-column grid (`grid-cols-2 md:grid-cols-3`) of `OrderCloudProductCard`, keyed by `` `${product.id}-${index}` `` (falls back to `` `product-${index}` `` if no ID) — the index suffix guards against duplicate/missing IDs from the API breaking React's key uniqueness.
- Header always shows an item count (when not loading/erroring) and a Retry/Refresh button, disabled while loading or (picker mode) with no selection.

## Detail page href resolution

`resolveProductListDetailPageHref({ configuredHref, routePath, pathname, isAuthoring })` (`lib/commerce/products/href.ts`):

- Prefers the author-configured `detailPageHref`.
- On the **live** site (not authoring), falls back to the current list page's own route (`pathname`/`routePath`) so cards still link somewhere useful even if `Detail Page` was never set — the assumption is the list page itself is often also capable of resolving a product via `last-url-segment`-style routing.
- `buildProductDetailHref(detailPageHref, productId)` then does the actual URL construction: parses `detailPageHref` as an absolute URL when possible (preserves origin/search/hash), otherwise treats it as a relative Sitecore path; in both cases strips a trailing Sitecore wildcard segment (`*` / `,-w-,`) and trailing slash before appending the URL-encoded product ID as the new last segment. Returns `undefined` if either input is missing.

## Known gaps

- No pagination — `productsService.list()` is called with no page/pageSize, so this only ever shows one page's worth of catalog results (see [../product-listing.md](../product-listing.md) known gaps).
- No debouncing/memoization of `selectedIdsKey`-driven refetches beyond the existing effect dependency array; large picker lists changing rapidly (e.g. author actively editing) could trigger frequent refetches, though this is only a concern in authoring/preview.
