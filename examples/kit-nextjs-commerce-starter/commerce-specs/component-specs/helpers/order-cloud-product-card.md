---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `commerce/OrderCloudProductCard` (helper)

> Part of [../../index.md](../../index.md). Purely presentational — not independently registered and has no context or service dependencies.

## Summary

Renders a single OrderCloud product as a card: image, name, optional ID/brand/category, price, and optional description. Used by `OrderCloudProductList`, the client experience behind the Sitecore-registered `ProductList` component.

- **Location:** `src/components/commerce/OrderCloudProductCard.tsx` (default export)
- **Rendering type:** client (`"use client"`)
- **Depends on:** none (no context, no services) — pure function of its props

## Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `product` | `CommerceProduct` (`lib/commerce/products/types.ts`) | — | `{ id, name, description?, imageUrl?, thumbnailUrl?, images[], brand?, category?, price?, currency? }` |
| `compact` | `boolean` | `false` | Hides the product ID line and description in compact mode; adjusts card padding (`p-2` vs `p-3`). |
| `href` | `string` | — | If present, wraps the card content in an `<a>`; otherwise renders a non-interactive `<article>`. |

## Rendering

- Image: `product.thumbnailUrl ?? product.imageUrl`, plain `<img loading="lazy">` inside an `aspect-square` container — no image renders if neither URL is present (no placeholder/fallback graphic).
- Name: `line-clamp-2` text.
- ID line (`ID: {product.id}`): only when `!compact`.
- Brand/category line: only if either is present, joined with `" · "` (`[brand, category].filter(Boolean).join(' · ')`).
- Price: `formatPrice(product.price, product.currency)` — same pattern as [ProductInfo](../product-info.md)'s local `formatPrice`, duplicated here rather than shared (see [Known gaps](#known-gaps)). Falls back to `"Price unavailable"` if `price` isn't a finite number.
- Description: `line-clamp-3`, only when present and `!compact`.

## Known gaps

- `formatPrice()` is defined independently here, in [`ProductInfo`](../product-info.md), and referenced conceptually in [`ProductSpecFields`](product-spec-fields.md)'s `formatMarkup()` — a shared `lib/commerce/format.ts` (or similar) utility would remove this duplication; flagged in [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §5 for the analogous `getDatasource`/`getNamedField` duplication and applies equally here.
- No `alt` text customization — `alt={product.name}` always, no per-image alt override even when `product.images` (plural) has more descriptive per-image alt text (that richer data is only used by [`ProductGallery`](../product-info.md#productgallery-private-sub-component) inside `ProductInfo`, not here).
