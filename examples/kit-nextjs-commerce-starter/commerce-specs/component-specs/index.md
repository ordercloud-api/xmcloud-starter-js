---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
---

# Commerce Component Specs

This is the component inventory: one markdown file per component, expanded with implementation detail pulled from the `kit-nextjs-commerce-starter` source (`src/components/...`, `src/contexts/...`, `src/lib/commerce/...`). For confirmed Sitecore template/rendering schemas, see [../templates-and-renderings.md](../templates-and-renderings.md). Architecture-level patterns shared across these components live in [../commerce-component-patterns.md](../commerce-component-patterns.md) and [../common-component-patterns.md](../common-component-patterns.md) — this directory documents each component individually rather than repeating those patterns.

## Sitecore-registered components

| Component | Spec |
|---|---|
| `ProductContainer` | [product-container.md](product-container.md) |
| `ProductInfo` | [product-info.md](product-info.md) |
| `AddToCart` | [add-to-cart.md](add-to-cart.md) |
| `ProductListing` | [product-listing.md](product-listing.md) |
| `SpecForm` | [spec-form.md](spec-form.md) |

## Helper components

Not independently registered in `.sitecore/component-map.ts` — consumed by the components above. See [helpers/](helpers/).

| Component | Spec |
|---|---|
| `commerce/OrderCloudProductList` | [helpers/order-cloud-product-list.md](helpers/order-cloud-product-list.md) |
| `commerce/OrderCloudProductCard` | [helpers/order-cloud-product-card.md](helpers/order-cloud-product-card.md) |
| `commerce/OrderCloudCart` | [helpers/order-cloud-cart.md](helpers/order-cloud-cart.md) |
| `commerce/ProductSpecFields` | [helpers/product-spec-fields.md](helpers/product-spec-fields.md) |
