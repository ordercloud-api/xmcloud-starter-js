---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `SpecForm`

> Part of [../index.md](../index.md). Must be rendered inside a [ProductContainer](product-container.md). See [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §3 for the XP-driven data/presentation split this component is built around, and [helpers/product-spec-fields.md](helpers/product-spec-fields.md) for the actual field-rendering logic (which `SpecForm` delegates to entirely).

## Summary

Renders the set of OrderCloud Spec-driven product options (size, color, engraving text, etc.) for the current product, and centralizes the loading/error/validation states around them. `SpecForm` itself is a thin wrapper — nearly all rendering logic lives in [`ProductSpecFields`](helpers/product-spec-fields.md); `SpecForm` handles only the container states (loading, error, empty) and which default option control to use.

- **Location:** `src/components/spec-form/SpecForm.tsx`
- **Rendering type:** client (`"use client"`)
- **Variants:** `Default` (dropdown default), `Buttons` (buttons default) — both implemented via a shared internal `SpecForm` component parameterized by `variantDefaultOptionControl`.
- **Registered as:** `SpecForm` in `.sitecore/component-map.ts` (client map)
- **Depends on:** `ProductDataContext` (`useProductContext()`), `ProductSpecFields` + `resolveDefaultOptionControl` (`@/components/commerce/ProductSpecFields`)

## Sitecore rendering parameters

No Datasource Template (confirmed — pure leaf rendering, all data from context), but it's the **one** component in this inventory with a custom Parameters Template field:

| Field | Type | Source |
|---|---|---|
| `DefaultOptionControl` | Droplist | `Dropdown\|Buttons` |

This exists for integrations that set rendering parameters directly, but **SitecoreAI Pages doesn't expose arbitrary custom rendering-parameter fields in its standard Design panel** — so the practical way an author sets the component-wide default is by picking the `SpecForm.Buttons` variant from the Design tab instead. See `docs/spec-form.md` in the source repo (reproduced across [helpers/product-spec-fields.md](helpers/product-spec-fields.md)).

## Default option control resolution order

```ts
const defaultOptionControl =
  variantDefaultOptionControl ??                                         // 1. which variant was selected (Default → "dropdown", Buttons → "buttons")
  resolveDefaultOptionControl(
    params.DefaultOptionControl ?? params["Default Option Control"],     // 2. rendering-parameter fallback, if variant prop is absent
  );
```

`resolveDefaultOptionControl(value)` returns `"buttons"` only if the value is the literal string `"buttons"` (case-insensitive); anything else (including `undefined`) resolves to `"dropdown"`. This component-wide default can still be overridden **per spec** by OrderCloud Spec XP (`presentation.control`) — see [helpers/product-spec-fields.md](helpers/product-spec-fields.md).

## Rendering states

Same status-driven pattern as [ProductInfo](product-info.md) / [AddToCart](add-to-cart.md), reading `productData.status`:

| `productData` / `status` | Rendering |
|---|---|
| `null` | Authoring: "SpecForm must be placed inside a ProductContainer." Live: nothing. |
| `"loading-session"` / `"loading-product"` | Skeleton: `h-10 w-full animate-pulse` bar, `aria-live="polite"`, screen-reader "Loading product options…". |
| `"configuration-error"` / `"not-found"` / `"error"` | Authoring-only message box, same three-way message logic as the other leaf components. |
| `"ready"` with product | Renders the container `<div data-component="SpecForm">` (below) — spec loading is then a **second**, independent status inside that container. |

## Ready-state: spec sub-states

Once `productData.status === "ready"`, the component further branches on `productData.specsStatus` (specs are fetched separately from the product itself, via `ProductDataContext`):

- `"loading"` → "Loading product options…" (`aria-live="polite"`).
- `"error"` → red alert box with `productData.specsError` and a "Retry" button calling `productData.retrySpecs()`.
- `"ready"` and `productData.specs.length > 0` → renders `<ProductSpecFields specs={...} selections={...} errors={validationErrors} defaultOptionControl={...} currency={product.currency} disabled={false} onChange={updateSelection} />`. If `specs.length === 0`, nothing renders (a product with no specs shows an empty `SpecForm` container).

## Known gaps

- `disabled={false}` is hardcoded when calling `ProductSpecFields` — there's no path today for `SpecForm` to disable inputs while `AddToCart` is submitting, even though `AddToCart`'s own quantity input does disable during `"adding"`. Worth revisiting if spec selection should lock during submission.
- Variant-vs-rendering-parameter precedence (variant always wins if selected) means an author who sets both the `Buttons` variant *and* a `DefaultOptionControl` rendering parameter of `Dropdown` will silently get buttons — no warning surfaced anywhere.
