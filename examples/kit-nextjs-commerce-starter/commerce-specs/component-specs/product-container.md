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

Composition root for a single product's UI. `ProductContainer` doesn't render any product data itself — it resolves **which** product to show, passes the resolved ID and starter mapper to Content SDK `ProductProvider`, and renders a dynamic placeholder so authors can drop any combination of leaf components (`ProductInfo`, `AddToCart`, `SpecForm`, …) inside it.

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

| Field                | Type                                                                                            | Source                                                       | Standard Values default |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------- |
| `Product Source`     | Droplist                                                                                        | `/sitecore/System/Settings/Project/commerce/Product Sources` | `OrderCloud Picker`     |
| `Product ID`         | Plugin (custom OrderCloud product picker, field-type id `d232ba1e-40fe-46c5-915a-2f46d0df87f5`) | —                                                            | —                       |
| `Preview Product ID` | Plugin (same custom picker)                                                                     | —                                                            | —                       |

The code reads these exact-cased field names first (`Product Source`, `Product ID`, `Preview Product ID`); camelCase/PascalCase variants (`productSource`, `ProductSource`, etc.) are checked as fallbacks but never match real authored content in this environment — they exist only for defensiveness. See `getNamedField` in `ProductContainer.tsx`.

While comparing authoring approaches, these fields remain Plugin fields so the Marketplace app can still be opened. The ProductContainer also renders a picker directly in the Pages canvas. Both approaches save only the OrderCloud product ID. After the comparison, the fields can be changed to Single-Line Text if the Marketplace app is removed.

## Props / datasource shape (`product-container.props.ts`)

```ts
type ProductContainerDatasource = {
  productSource? | ProductSource? | "Product Source"?: string (or { value } / { jsonValue: { value } });
  productId? | ProductId? | "Product ID"?: string (or field-wrapped);
  previewProductId? | PreviewProductId? | "Preview Product ID"?: string (or field-wrapped);
};
```

`fields` may be the datasource directly or nested under `fields.data.datasource` — `getDatasource()` normalizes either shape. `getFieldValue()` unwraps `{ jsonValue: { value } }` and `{ value }` field wrappers down to a raw primitive/object before it's parsed.

Rendering params consumed: `params.styles`, `params.RenderingIdentifier`, `params.DynamicPlaceholderId`.

## Behavior

1. Reads `Product Source` → normalized via `normalizeProductSource()` (`lib/commerce/products/reference.ts`) to `"last-url-segment" | "ordercloud-picker" | undefined`. Matching is substring/case-insensitive (`includes("picker")`, `includes("url")`), so `"OrderCloud Picker"`, `"picker"`, etc. all resolve to `"ordercloud-picker"`.
2. Reads `Product ID` and `Preview Product ID` as plain OrderCloud IDs. Structured/JSON references are intentionally unsupported.
3. In authoring mode, shows an in-component selector for `Product ID` in picker mode or `Preview Product ID` in URL mode. Saving writes the ID through the Sitecore Authoring and Management API and refreshes product context immediately.
4. `ProductContainerContent` resolves the starter-specific product reference and renders Content SDK `ProductProvider` with the resolved `productId`, `selectCommerceProduct` mapper and starter `validateProductSpec` callback.
5. Inside the provider, renders `AppPlaceholder` (`@sitecore-content-sdk/nextjs`) named `product-container-{params.DynamicPlaceholderId ?? "0"}`, passing through `rendering`, `page`, and the component map — this is what makes the placeholder "dynamic" (authors can add multiple `ProductContainer` instances on one page, each with its own placeholder key and independent product context).
6. `isAuthoring = page.mode.isEditing || page.mode.isPreview || page.mode.isDesignLibrary` controls preview-ID fallback and in-context picker UI.

## Product ID resolution (delegated to `ProductDataProvider` → `resolveProductId()`)

- `source === "ordercloud-picker"` → uses `selectedProduct?.id` (from `Product ID`).
- `source === "last-url-segment"` → uses the last segment of the current route (`RoutePathContext`, URL-decoded). If that segment is a Sitecore wildcard (`*` or `,-w-,`) or the path is empty:
  - in authoring/preview mode, falls back to `previewProduct?.id` (`Preview Product ID`);
  - on the live site, resolves to `undefined` (→ `configuration-error` downstream).
- Any other/unrecognized source → `undefined`.

## State provided to children

Children consume `useProduct()`, `useProductOptions()` and `useProductSelection()` from `@sitecore-content-sdk/nextjs/commerce`. Product statuses are SDK statuses (`idle | loading | success | not-found | error`); option statuses are `idle | loading | success | error`.

The container relies on ambient `OrderCloudContext`/SDK `CommerceProvider` for the shopper session and `RoutePathContext` for route segments.

## Known gaps

- No visual/error state of its own — all loading/error UI is delegated to leaf components reading the SDK product hooks.
- `data-class-change` attribute on the wrapper `<section>` is present in the source but undocumented — no other component in this inventory uses it.
