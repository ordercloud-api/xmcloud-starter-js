---
initiative: commerce-starter-spec
created: 2026-09-17
author: row_sitecore
status: draft
---

# `CartButton`

> Part of [../index.md](../index.md). Draft — not yet implemented / not yet confirmed against a live Sitecore template. Header chrome placed in Navigation's **right** placeholder. Cross-cutting header work: [cart-row-minicart-copy.md](cart-row-minicart-copy.md) Decision C. Destination helper: `lib/commerce/cart/destination.ts`.

## Summary

Leaf rendering for the header bag: an icon plus an optional visible "Cart" label, always a **link** to the cart page (default `/cart`). Authors drop it into Navigation's right slot. It does **not** fetch the OrderCloud cart, show a count, or open a flyout — those need a shared cart snapshot (Task 3) and would be a later MiniCart slice.

SYNC `HeaderST` is the layout precedent (logo + nested placeholder + cart control). Do **not** copy SYNC `MiniCart.tsx`: that flyout is hardcoded empty.

- **Proposed location:** `src/components/cart-button/CartButton.tsx` (+ `cart-button.props.ts` for params)
- **Rendering type:** server
- **Variants:** `Default` only
- **Would register as:** `CartButton` in `.sitecore/component-map.ts` (server map). Folder is **not** under `src/components/commerce/` so CLI map generation includes it.
- **Depends on:** `getCartDestination` / `getCartDestinationFromRoute` (`lib/commerce/cart/destination.ts`)

## Sitecore template/rendering (proposed — not yet confirmed)

**No Datasource Template.** Pure leaf, like `AddToCart` / `ProductInfo` / `SpecForm`. Label and href come from rendering parameters (and the route's Navigation `CartPage` as fallback).

Proposed Parameters Template fields (optional — this CM often does **not** show Parameters Template on Json/SXA renderings; the Parameters **string** is the reliable authoring surface, same as `CartPage=/cart` on Navigation):

| Field | Type | Default | Purpose |
|---|---|---|---|
| `ShowCartLink` | Checkbox | checked (`1`) | Show the visible title next to the icon. Unchecked = icon only (`aria-label` still names the control). |
| `CartPage` | Single-Line Text | empty → inherit | Same key as Navigation. Path (`/cart`, `/basket`) or GUID. Empty uses Navigation's destination, then `/cart`. |

Do **not** add `showMiniCart`. HeaderST uses that to swap a link for a flyout; there is no flyout yet, so a checked box would be dead.

Do **not** add a CartLink General Link field. Destination is already `CartPage` / `/cart`. A second link field would fork AddToCart "View cart" and Layout `isCartRoute`.

## Manual Content Editor Instructions

No datasource item. Create the rendering and place it in the header.

1. In Content Editor, under `/sitecore/layout/Renderings/Project/commerce/`, insert a **JSON rendering** named `CartButton`.
2. Set **componentName** to `CartButton` (must match the component map). Leave **Datasource Template** empty.
3. Optional: Parameters Template under `Templates/Project/commerce/Rendering Parameters` with a Checkbox `ShowCartLink` (title "Show cart link"). If this CE still hides Parameters Template on Json renderings, skip the template and use the Parameters **string** instead (`ShowCartLink=1` or `ShowCartLink=0`). Same for `CartPage=/cart` when not inheriting from Navigation.
4. Allow `CartButton` on Navigation's right placeholder (see [cart-row-minicart-copy.md](cart-row-minicart-copy.md) Task 4 CE steps). Also allow it on `headless-header` if authors need a fallback outside Navigation.
5. In **Pages**, open the **header partial**. Drop `CartButton` into Navigation's **right** placeholder. Do not add a MiniCart rendering.
6. Preview: the bag is a link to `/cart` (or authored `CartPage`). With `ShowCartLink=0`, only the icon shows; the accessible name is still "Cart".

## Props / datasource shape

No datasource. Params only:

```ts
type CartButtonParams = {
  styles?: string;
  RenderingIdentifier?: string;
  ShowCartLink?: string; // "1" | "true" | "0" | "false" | omit
  CartPage?: string;
  Parameters?: string; // e.g. "ShowCartLink=0&CartPage=/basket"
};
```

Checkbox parse (reuse Flattened / HeaderST semantics): `"1"` and `"true"` (case-insensitive) are on; `"0"`, `"false"`, and empty are off. **Omitted → on** so the starter shows a visible Cart label before anyone sets the param.

Href resolution:

1. `getCartDestination(params)` if `CartPage` (or Parameters string) is set on **this** rendering.
2. Else `getCartDestinationFromRoute(page.layout.sitecore.route)` (Navigation's `CartPage`).
3. Else `{ href: "/cart" }`.

Never treat `/checkout` as cart.

## Behavior

1. Resolve href as above.
2. Resolve `showCartLink` from params / Parameters string (default true).
3. Render `<a>` (Next `Link` or Content SDK `Link` with a constructed href — there is no Sitecore Link field) with `data-component="CartButton"`, `params.styles`, `params.RenderingIdentifier`.
4. Inner: inline SVG bag icon (no new icon package — this starter has neither Lucide nor FontAwesome) + visible text "Cart" when `showCartLink`. When hidden, `aria-label="Cart"` on the link.
5. Authoring with no extra config still renders the default link (not a dashed empty box). There is nothing to "configure" before the control is useful.

## OrderCloud model(s)/service(s) involved

None in this slice. The button does not call `cart.get()` / `addItem` / `Me`. A later MiniCart would read the shared snapshot from Task 3 (`useCommerceCart`), not open its own `cart.get()` island.

## Known gaps / open questions

- No item count. Count without `cartRevision` would stay stale after AddToCart.
- No flyout. Do not ship SYNC's empty MiniCart as a stand-in.
- Visible label is hardcoded English until Task 5 dictionary (`CART_ViewCart` / heading). Icon-only still has `aria-label="Cart"`.
- Navigation must expose the right placeholder and stop auto-rendering the Task 2.5 cart-role sibling, or authors get two bags. That is the paired Navigation change in the cart-row draft, not this file.
- Parameters Template may never appear in this CE; Parameters string is the contract.
