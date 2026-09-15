---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `ProductContainer`

> Part of [../index.md](../index.md). See [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §1–§2 for the container+context and product-source-resolution patterns this component implements.

## Summary

Composition root for a single product's UI. `ProductContainer` doesn't render any product data itself — it resolves **which** product to show, provides that resolution (and all related async state) to descendants via `ProductDataContext`, and renders a dynamic placeholder so authors can drop any combination of leaf components (`ProductInfo`, `AddToCart`, `SpecForm`, …) inside it.

- **Location:** `src/components/product-container/ProductContainer.tsx` (+ `product-container.props.ts`)
- **Rendering type:** server component; wraps a dynamic placeholder
- **Variants:** `Default` only
- **Registered as:** `ProductContainer` in `.sitecore/component-map.ts`

## Sitecore template/rendering (confirmed, `dev` CM)

- Rendering: `/sitecore/layout/Renderings/Project/commerce/ProductContainer`
- Datasource template: `/sitecore/templates/Project/commerce/ProductContainer` (section "Settings")
- `OtherProperties`: `IsRenderingsWithDynamicPlaceholders=true`
- Linked Placeholder Settings item: `/sitecore/layout/Placeholder Settings/Project/commerce`
- No custom rendering-parameter fields beyond base (`styles`, `RenderingIdentifier`) — `DynamicPlaceholderId` is a standard dynamic-placeholder parameter, not a custom field.

| Field | Type | Source | Standard Values default |
|---|---|---|---|
| `Product Source` | Droplist | `/sitecore/System/Settings/Project/commerce/Product Sources` | `OrderCloud Picker` |
| `Product ID` | Plugin (custom OrderCloud product picker, field-type id `d232ba1e-40fe-46c5-915a-2f46d0df87f5`) | — | — |
| `Preview Product ID` | Plugin (same custom picker) | — | — |

The code reads these exact-cased field names first (`Product Source`, `Product ID`, `Preview Product ID`); camelCase/PascalCase variants (`productSource`, `ProductSource`, etc.) are checked as fallbacks but never match real authored content in this environment — they exist only for defensiveness. See `getNamedField` in `ProductContainer.tsx`.

## Props / datasource shape (`product-container.props.ts`)

```ts
type ProductContainerDatasource = {
  productSource? | ProductSource? | "Product Source"?: string (or { value } / { jsonValue: { value } });
  productId? | ProductId? | "Product ID"?: string | ProductReference (or field-wrapped);
  previewProductId? | PreviewProductId? | "Preview Product ID"?: string | ProductReference (or field-wrapped);
};
```

`fields` may be the datasource directly or nested under `fields.data.datasource` — `getDatasource()` normalizes either shape. `getFieldValue()` unwraps `{ jsonValue: { value } }` and `{ value }` field wrappers down to a raw primitive/object before it's parsed.

Rendering params consumed: `params.styles`, `params.RenderingIdentifier`, `params.DynamicPlaceholderId`.

## Behavior

1. Reads `Product Source` → normalized via `normalizeProductSource()` (`lib/commerce/products/reference.ts`) to `"last-url-segment" | "ordercloud-picker" | undefined`. Matching is substring/case-insensitive (`includes("picker")`, `includes("url")`), so `"OrderCloud Picker"`, `"picker"`, etc. all resolve to `"ordercloud-picker"`.
2. Reads `Product ID` and `Preview Product ID` → parsed via `parseProductReference()` into `{ id, name? }`. Accepts a plain string, a JSON-string reference, or an already-structured object (checks `id`/`productId`/`ID` keys).
3. Renders a `<section>` wrapper (`data-component="ProductContainer"`, `data-class-change`) with `params.styles` / `params.RenderingIdentifier`, wrapping everything in `ProductDataProvider` (`source`, `selectedProduct`, `previewProduct`, `isAuthoring`).
4. Inside the provider, renders `AppPlaceholder` (`@sitecore-content-sdk/nextjs`) named `product-container-{params.DynamicPlaceholderId ?? "0"}`, passing through `rendering`, `page`, and the component map — this is what makes the placeholder "dynamic" (authors can add multiple `ProductContainer` instances on one page, each with its own placeholder key and independent product context).
5. `isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary` is passed to the provider so it knows whether to fall back to `Preview Product ID` when there's no concrete product in the URL (see below).

## Product ID resolution (delegated to `ProductDataProvider` → `resolveProductId()`)

- `source === "ordercloud-picker"` → uses `selectedProduct?.id` (from `Product ID`).
- `source === "last-url-segment"` → uses the last segment of the current route (`RoutePathContext`, URL-decoded). If that segment is a Sitecore wildcard (`*` or `,-w-,`) or the path is empty:
  - in authoring/preview mode, falls back to `previewProduct?.id` (`Preview Product ID`);
  - on the live site, resolves to `undefined` (→ `configuration-error` downstream).
- Any other/unrecognized source → `undefined`.

## Context provided to children

`ProductDataContext` (`src/contexts/ProductDataContext.tsx`) — see [product-info.md](product-info.md), [add-to-cart.md](add-to-cart.md), [spec-form.md](spec-form.md) for how leaf components consume it. Exposes: `productId`, `product`, `status` (`loading-session | loading-product | ready | not-found | configuration-error | error`), `error`, `retry`, `specs`, `specsStatus`, `specsError`, `retrySpecs`, `selections`, `areSpecSelectionsValid`, `validationErrors`, `updateSelection`, `setValidationErrors`.

Also relies on ambient `OrderCloudContext` (anonymous session) and `RoutePathContext` (current route segments), both expected to be provided higher up the tree (e.g. in the app's root layout / providers), not by `ProductContainer` itself.

## Known gaps

- No visual/error state of its own — all loading/error UI is delegated to leaf components reading `ProductDataContext.status`. If a page places no leaf components inside a `ProductContainer`, there's no visible feedback that the container's product resolution failed.
- `data-class-change` attribute on the wrapper `<section>` is present in the source but undocumented — no other component in this inventory uses it.
