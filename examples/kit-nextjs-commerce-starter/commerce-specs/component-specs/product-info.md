---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `ProductInfo`

> Part of [../index.md](../index.md). Must be rendered inside a [ProductContainer](product-container.md) — reads product state from `ProductDataContext` rather than accepting props/fields of its own.

## Summary

Client leaf component that renders the currently-resolved product's gallery, name, price, and description. Has no Sitecore-authored fields of its own (confirmed: no Datasource Template on the `ProductInfo` rendering item) — everything comes from context.

- **Location:** `src/components/product-info/ProductInfo.tsx` (+ `ProductGallery.tsx`, a private sub-component)
- **Rendering type:** client (`"use client"`)
- **Variants:** `Default` only
- **Registered as:** `ProductInfo` in `.sitecore/component-map.ts` (client map, since it's a client component)
- **Depends on:** `ProductDataContext` (via `useProductContext()`)

## Rendering states

`ProductInfo` mirrors the same status-driven rendering pattern used by [AddToCart](add-to-cart.md) and [SpecForm](spec-form.md) — all three read `ProductDataContext.status` and render equivalent state UI, just with component-specific messaging and skeletons:

| `productData` / `status` | Rendering |
|---|---|
| `null` (no `ProductDataContext` in the tree) | Authoring: dashed amber warning box "ProductInfo must be placed inside a ProductContainer." Live: renders nothing. |
| `"loading-session"` or `"loading-product"` | Animated skeleton: `aspect-square` image placeholder + two text-line placeholders, `aria-live="polite"`, screen-reader-only "Loading product information…" text. |
| `"configuration-error"` | Authoring only: "Configure Product Source and its corresponding product ID on ProductContainer." Live: renders nothing. |
| `"not-found"` | Authoring only: `` Product `{productId}` was not found. `` Live: renders nothing. |
| `"error"` (or any other non-`"ready"` status) | Authoring only: `productData.error?.message` or a generic fallback message. Live: renders nothing. |
| `"ready"` with `productData.product` | Full render (below). |

The authoring-only messages are wrapped in a dashed border box: `` <span className="font-medium">ProductInfo:</span> {message} ``. `isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary`.

## Ready-state markup

```tsx
<article className={`grid gap-6 md:grid-cols-2 ${params.styles ?? ""}`} id={params.RenderingIdentifier} data-component="ProductInfo">
  <ProductGallery images={product.images} productName={product.name} isAuthoring={isAuthoring} />
  <div className="space-y-4">
    <h1>{product.name}</h1>
    <p>{formatPrice(product.price, product.currency)}</p>
    {product.description && <p>{product.description}</p>}
  </div>
</article>
```

`formatPrice()` uses `Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" })`, falling back to `` `${price.toFixed(2)} ${currency || "USD"}` `` if `Intl` throws (e.g. invalid currency code). Returns `"Price unavailable"` if `price` is `undefined`.

> **Note:** `product.name` and `product.description` are rendered as plain text (`{product.name}`), not via Sitecore's `<Text>`/`<RichText>` field components. This is intentional and correct here — this content is OrderCloud product data, not a Sitecore-authored field, so there's nothing to preserve in-context editing for. It does mean this text is **not sanitized against XSS** beyond React's default JSX escaping; if OrderCloud product names/descriptions can ever contain HTML, that's a boundary worth revisiting (see the source repo's security best practice: sanitize/validate all external input at the boundary).

## `ProductGallery` (private sub-component)

Not independently registered as a Sitecore component or listed in the inventory — it's a plain React component co-located in `product-info/ProductGallery.tsx` and used only by `ProductInfo`.

- **Props:** `images: CommerceProductImage[]`, `productName: string`, `isAuthoring: boolean`.
- Maintains local `selectedUrl` state (`useState`, defaults to `images[0]?.url`); `selectedImage` is derived by looking up `selectedUrl` in `images`, falling back to `images[0]`.
- If no image is available: authoring shows a dashed placeholder ("No product images are available."), live renders nothing.
- Main image: plain `<img>` (not Content SDK `<Image>` — this is OrderCloud image data, not a Sitecore media field), `aspect-square`, `object-contain`.
- If `images.length > 1`, renders a horizontally-scrolling thumbnail strip (`overflow-x-auto`) of buttons, each with `aria-label="View image {n} of {total}"` and `aria-pressed={isSelected}`; selected thumbnail gets a `border-slate-900` ring, others `border-transparent`. Thumbnails use `image.thumbnailUrl ?? image.url`.

## Known gaps

- `ProductGallery` isn't in the confirmed component inventory table (it's a sub-component, not a registered rendering) — worth calling out explicitly if a future spec formalizes a standalone gallery component/variant.
- No keyboard-arrow navigation between thumbnails, only click/tap (`aria-pressed` buttons); acceptable for an MVP gallery but worth confirming against the repo's accessibility bar for a formal spec.
