---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `ProductListing`

> Part of [../index.md](../index.md). See [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §2 for the three-way product-list-source pattern this component implements. Unlike the other four Sitecore-registered components, `ProductListing` is **not** a child of [ProductContainer](product-container.md) — it's a standalone server rendering with its own Sitecore datasource.

## Summary

Renders a grid of products, sourced either from a Sitecore-authored datasource (`products` treelist), a picked list of specific OrderCloud product IDs, or a live OrderCloud catalog listing — falling back through [OrderCloudProductList](helpers/order-cloud-product-list.md) for the two OrderCloud-backed modes.

- **Location:** `src/components/product-listing/ProductListing.tsx` (+ `product-listing.props.ts`)
- **Rendering type:** server (renders a client helper, `OrderCloudProductList`, for the OrderCloud-backed branches)
- **Variants:** `Default`, `ThreeUp`, `Slider` — **`ThreeUp` and `Slider` are currently identical aliases of `Default`** (`export const ThreeUp: React.FC<ProductListingProps> = (props) => <Default {...props} />;`, same for `Slider`). No layout differentiation exists yet.
- **Registered as:** `ProductListing` in `.sitecore/component-map.ts`

## Sitecore template/rendering status

**Not present** under `/sitecore/templates/Project/commerce` or `/sitecore/layout/Renderings/Project/commerce` in the `dev` CM environment pulled for this spec — either it's serialized under a different module/path, or it hasn't been created as a real Sitecore item yet. This is a confirmed gap (see [../../templates-and-renderings.md](../../templates-and-renderings.md) and [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §5). The field names below are inferred from the code (`product-listing.props.ts`), **not** confirmed against a live template.

## Props / datasource shape (`product-listing.props.ts`)

| Field (any of these name variants) | Type (inferred) | Purpose |
|---|---|---|
| `title` | `Field<string>` | Section heading, rendered via `<Text>`. |
| `viewAllLink` | `LinkField` | Optional "view all" link, rendered via `<Link>`. |
| `detailPage` / `productDetailPage` / `"Detail Page"` | `LinkField` | Base href for product detail pages; last segment gets replaced with the product ID (see [href resolution](#detail-page-href-resolution)). |
| `productListSource` / `ProductListSource` / `"Product List Source"` | string | One of `sitecore`, `ordercloud-catalog`, `ordercloud-picker` (normalized, see below). |
| `orderCloudProducts` / `OrderCloudProducts` / `productIds` / `"Product IDs"` | reference list | Specific OrderCloud product IDs for `"ordercloud-picker"` mode. |
| `products` | `{ targetItems: ProductListingSitecoreProduct[] }` | Sitecore-authored product items (treelist datasource) for `"sitecore"` mode. |

Each `ProductListingSitecoreProduct` target item exposes `productName`, `productThumbnail` (`ImageField`), `productBasePrice`, `productFeatureTitle`, `productFeatureText`, `productDrivingRange`, and an optional `url.path` (internal Sitecore page link).

Rendering params: `params.detailPage` / `params.DetailPage` and `params.productListSource` / `params.ProductListSource` are also checked (fallback if not set on the datasource) — `getParamHref()` / `normalizeProductListSource()`.

## List-source resolution

`resolveProductListSource({ configured, hasSitecoreProducts })` (`lib/commerce/products/list-source.ts`):

1. `configured` = `normalizeProductListSource()` of (in priority order) the datasource field, then `params.productListSource`, then `params.ProductListSource`. Normalization is substring/case-insensitive: `"picker"` → `ordercloud-picker`; `"sitecore"`/`"treelist"`/`"cms"` → `sitecore`; `"catalog"`/`"ordercloud"` → `ordercloud-catalog`.
2. If nothing configured: falls back to `"sitecore"` if the datasource has an explicit datasource **and** `products.targetItems.length > 0`; otherwise falls back to `"ordercloud-catalog"`.

`hasExplicitDatasource = Boolean(rendering.dataSource?.trim())` — the component distinguishes "no datasource item bound to this rendering at all" from "datasource bound but its `products` treelist is empty", since only the latter should be able to silently fall back to the OrderCloud catalog with a hint message.

## Rendering by source

- **`"sitecore"`:** 2/3-column grid (`grid-cols-2 md:grid-cols-3`) of local `ProductCard` elements, one per `products.targetItems` entry. Each card renders `productThumbnail` via `<Image>`, `productName` via `<Text tag="h3">`, `productBasePrice` via `<Text>`, `productFeatureTitle`/`productFeatureText` via `<Text>` — all real Sitecore field components (in-context editing preserved). If empty: authoring shows a hint to add products or switch source; live shows "No products configured." Card links: authoring mode never links (`href={undefined}` when `isAuthoring`, so editors don't navigate away); live mode uses `product.url?.path` (internal Sitecore link) if present, else [`buildProductDetailHref(detailPageHref, product.id)`](helpers/order-cloud-product-list.md#detail-page-href-resolution).
- **`"ordercloud-catalog"` / `"ordercloud-picker"`:** delegates to [`OrderCloudProductList`](helpers/order-cloud-product-list.md), passing `title` ("Live OrderCloud products" or "Selected OrderCloud products"), `compact`, `source`, `productIds` (from the parsed reference list), `detailPageHref`, `isAuthoring`. If the source silently fell back to `"ordercloud-catalog"` from an explicit-but-empty Sitecore datasource (`showCatalogFallbackHint`), shows an extra hint: "No Sitecore products configured in datasource. Showing live products instead."

`viewAllLink`, when present and non-empty (`hasLinkValue`), renders below the grid via `<Link>`.

## Known gaps

- `ThreeUp` and `Slider` variants have no real implementation — needed if this spec is extended with actual layout differentiation (e.g. a carousel for `Slider`).
- No confirmed Sitecore template/rendering item — field names in this doc are inferred from `product-listing.props.ts`, not verified serialization output.
- No pagination for the `"sitecore"` branch (`products.targetItems` is rendered in full); `OrderCloudProductList`'s catalog branch also has no pagination (see its own known gaps).
