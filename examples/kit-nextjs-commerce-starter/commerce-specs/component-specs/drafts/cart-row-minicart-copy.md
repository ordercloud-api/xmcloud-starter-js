---
initiative: commerce-starter-spec
created: 2026-09-16
author: row_sitecore
status: draft
---

# Cart product row, header mini-cart, author-owned copy

> Part of [../index.md](../index.md). **Draft** — not yet implemented. Cross-cutting slice (not a new Sitecore rendering). Extends [helpers/order-cloud-cart.md](../helpers/order-cloud-cart.md) and [add-to-cart.md](../add-to-cart.md). Archive rules: [../../README.md](../../README.md).

One slice, implemented **in this order**. Promo codes and shipping/auth-merge are explicitly later and must not expand this work.

This is a **mapper + UI** slice against the cart the starter already has. It does **not** add a new Sitecore template for line items. Author copy uses dictionary (and optional cart-page fields) — see [Manual Content Editor Instructions](#manual-content-editor-instructions).

**On promote:** fold into `helpers/order-cloud-cart.md` (and a `ShoppingCart` inventory row if we add one), add `helpers/mini-cart.md` if that helper ships, then delete this draft. Do not promote this file as a permanent `slices/` doc.

## Current state (what we are extending)

| Piece | Today |
|---|---|
| Cart mapper | `toCommerceCart` keeps `id`, `productId`, `name`, `quantity`, `unitPrice` only. Drops `Product.xp.Images` and `Specs`. |
| Cart UI | `commerce/ShoppingCart` is a text list: name, unit price, +/−, line total, Remove. Hardcoded English. |
| Sitecore wrapper | `shopping-cart/ShoppingCart` is a leaf rendering with **no datasource template** (`ShoppingCartProps = ComponentProps`). Authoring hint only. |
| Cart page | `Layout` renders that helper on the cart route when `headless-main` is empty. |
| Add to cart | Mutates OrderCloud, then shows local "Added to cart" + `/cart` link. **Does not notify** the cart UI. |
| Header | `Navigation` treats the **last authored link as Cart chrome**. Plain link, no count, no flyout. |
| Shared cart state | None. Each cart surface independently calls `cart.get()`. |

`AddToCart`'s own spec already called this out: a badge/mini-cart cannot work until something re-fetches after add.

## 1. Thumbnail vs `xp.Images` — the confusion

There is **no OrderCloud product field named "thumbnail image"**. There are three different image ideas in this starter, and only one of them belongs on a cart row.

```
Sitecore ProductListing card          OrderCloud product / line item
──────────────────────────            ────────────────────────────────
productThumbnail (ImageField)         xp.Images[]  ← this is the catalog
on a CMS product item                 each entry:
                                      { Url, Thumbnailurl?, Primary? }
                                      mapper then derives:
                                        images[]   (primary first)
                                        imageUrl   = images[0].url
                                        thumbnailUrl = images[0].thumbnailUrl
                                                       ?? images[0].url
```

- **`productThumbnail`** is a Sitecore Image field on **CMS-authored** listing items (`ProductListingSitecoreProduct`). Cart line items are OrderCloud rows, not those items. Do not look for this field on the cart.
- **`xp.Images`** is the OrderCloud catalog image array. The seed script writes one primary entry with `Url` and `Thumbnailurl` (often the **same URL** on demo products). Gallery products can have several images; `Primary: true` wins as the hero.
- **`Thumbnailurl` on an image** is an optional smaller URL **for that image**, not a separate product-level field. `toCommerceProduct` already maps `image.Thumbnailurl` → `thumbnailUrl`. Product cards and the PDP gallery already use `thumbnailUrl ?? url`.
- **`CommerceProduct.thumbnailUrl`** is a **derived convenience** on the mapped product. It is not stored on the product as its own XP key.

**Cart row rule (this slice):** reuse the product mapper's image helper on `LineItem.Product.xp`. Render `thumbnailUrl ?? imageUrl`. If the array is missing or empty, render the row with no image (same as `OrderCloudProductCard` — no placeholder graphic). Do **not** add a Sitecore image field. Do **not** fetch `Me.GetProduct` just to get a picture.

**If thumbnails don't show after mapping:** the OrderCloud line-item `Product` snapshot may be slimmer than a full buyer product. Confirm in the network tab that `Cart.ListLineItems` returns `Product.xp.Images`. If it does not, that is an OrderCloud payload gap, not a Sitecore gap — a follow-up fetch is out of this slice.

## 2. How to apply the slice

### Decision A — Shared cart snapshot (required for mini-cart)

**Recommendation: wrap cart mutations on `OrderCloudContext` and expose a revision (or snapshot) that every cart surface subscribes to.**

Do not give MiniCart its own `cart.get()` island. `AddToCart` already talks to `useOrderCloud().cart`; if `addItem` / `updateItem` / `removeItem` bump a `cartRevision` (or replace `cartSnapshot`) inside the provider, the header updates without visiting `/cart`.

Extract a `useCommerceCart()` hook used by the full cart and the flyout:

- load on `status === "authenticated"` and whenever `cartRevision` changes
- expose `payload`, `loading`, `error`, `changeQuantity`, `removeItem`, `checkout`

Keep checkout in that helper so the flyout and the cart page do not fork hosted-checkout logic.

### Decision B — One line-row helper, two densities

**Recommendation: extract `CartLineRow` (or `CartPanel` + row) from `commerce/ShoppingCart`. Full page = comfortable row. Flyout = compact row. Same mapped item.**

Row contents (full and compact):

| Element | Source | Notes |
|---|---|---|
| Thumbnail | mapped `thumbnailUrl ?? imageUrl` | `<img>`, lazy, `alt` = product name. Omit if no URL. |
| Name | `item.name` | Link to PDP when href exists. |
| Selected specs | `item.specs` | `Name: Value` (or `OptionValue` if `Value` empty). Omit blanks. |
| Qty +/−, Remove | existing behavior | Compact flyout still gets qty + remove — otherwise the flyout is a teaser and shoppers are forced to `/cart`. |
| Unit / line total | existing | Compact can hide "each" and keep line total. |

**PDP href:** `buildProductDetailHref(CATALOG_LIST_HREF, item.productId)` → `/products/{id}`. That is the same convention `HomeFeaturedProducts` already uses. No new Sitecore link field in this slice.

If a live site's PDP is **not** `/products/{id}`, that is a Content Editor / IA problem on the product page, not a cart-template problem. Do not add `productDetailPage` to ShoppingCart unless we later find `/products` is wrong in this environment.

### Decision C — Mini-cart placement

**Recommendation: MiniCart is header chrome, not a new Sitecore rendering.**

Mount it by wrapping Navigation's **utility (last) item** — the starter already documents that item as Cart. The authored link's `Href` is the "View cart" target (`/cart`). The authored title is the accessible name. Badge + flyout sit on that control.

Do **not** register `MiniCart` in the component map. Authors should not have to place it on every page.

Fallback: if Navigation has fewer than two links (no utility item), still render a MiniCart in `Layout` `<header>` pointing at `/cart`, so a missing Cart nav item does not hide the count.

**Do not** keep a duplicate plain "Cart" text link next to the bag. Wrapping the utility item avoids that.

Flyout:

- Closed: icon/control + count badge (`aria-label` like "Cart, 3 items"). Count is **sum of quantities**, same as the cart page. `0` still shows (empty flyout is allowed — that is how shoppers learn add-to-cart worked).
- Open: compact rows, subtotal, Checkout (same `startHostedCheckout` path), "View cart" using the nav href.
- Keyboard: toggle button, Escape closes, focus returns to the control. Treat as a disclosure, not a modal, unless focus starts leaking into the page.
- After `AddToCart` succeeds, bump revision so the badge updates on the PDP **without** navigation. Optional later: auto-open the flyout once — not in this slice (easy to annoy).

### Decision D — Author-owned copy: dictionary first, fields optional

This starter's commerce leaves (`AddToCart`, `ProductInfo`, `SpecForm`) have **no datasource fields**; they hardcode English. The commerce component that *does* own copy is `ProductListing` (`title`, `viewAllLink`) via **Sitecore fields**. Kit starters (SYNC / Alaris / Solterra) use **dictionary items** + `dictionaryKeys` + `useI18n`/`useTranslations`.

Mini-cart lives in the header on every page. A ShoppingCart datasource only exists on the cart page, so **fields-only copy cannot feed the flyout** without a second datasource or a new template.

**Recommendation for this slice:**

1. **Sitecore Dictionary** is the source of truth for shared chrome strings (heading, empty state, checkout label, view cart, continue shopping, remove, loading).
2. Hardcoded English fallbacks so the starter runs before anyone creates dictionary items.
3. **Do not add a ShoppingCart datasource template in this slice** unless we decide the cart *page* heading must be in-context editable in Pages. That would be a new template — extra CE work — and MiniCart would still need the dictionary.

`next-intl` already loads `client.getDictionary()` in `src/i18n/request.ts`. This starter just never introduced `src/variables/dictionary.tsx`. Copy the kit-starter pattern: keys in code, items in the site Dictionary.

Strings in scope (heading / empty / checkout were requested; include the few adjacent labels so we do not leave a mixed hardcode island):

| Key (proposed) | Default English | Used by |
|---|---|---|
| `CART_Heading` | Shopping Cart | Cart page |
| `CART_EmptyTitle` | Your shopping cart is empty | Cart page + flyout |
| `CART_EmptyBody` | Add a product, then come back here to check out. | Cart page (flyout can omit body) |
| `CART_Checkout` | Checkout | Cart page + flyout |
| `CART_CheckoutStarting` | Starting checkout… | both |
| `CART_ViewCart` | View cart | flyout + AddToCart success link |
| `CART_ContinueShopping` | Continue shopping | Cart page |
| `CART_Remove` | Remove | row |
| `CART_Loading` | Loading cart… | both |
| `CART_ItemCount_one` / `_other` | `{count} item` / `{count} items` | cart page subtitle + badge |

Quantity/subtotal/tax/total stay hardcoded for this slice (or we add them if dictionary creation is cheap). Do not dictionary-ize error messages from OrderCloud.

## 3. Mapper contract

Extend `CommerceCartItem` (optional fields only — Stripe checkout mapper already keys off `id`, `productId`, `name`, `quantity`, `unitPrice` and must keep working):

```ts
export interface CommerceCartItemSpec {
  specId: string;
  name?: string;
  optionId?: string;
  value?: string;
}

export interface CommerceCartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  specs?: CommerceCartItemSpec[];
}
```

`toCommerceCartItems`:

1. Keep today's productId / name / qty / price mapping.
2. Run the shared `getImages(asRecord(row.Product?.xp))` helper (extract from `products/mapper.ts` so PDP and cart cannot drift).
3. Set `imageUrl` / `thumbnailUrl` the same way `toCommerceProduct` does.
4. Map `row.Specs` to `{ specId, name, optionId, value }` using `Name`, `Value` or `OptionValue`. Drop entries with no specId.

No new OrderCloud API. No inventory/price recalculation. No promo fields on the cart type yet.

Tests to add in `src/__tests__/cart.test.ts` (mapper-level; extract mapper tests if the service test file gets noisy):

- primary image + `Thumbnailurl` → `thumbnailUrl`
- images without `Thumbnailurl` → `thumbnailUrl` falls back to `Url`
- `Primary: true` not first in the array still wins
- missing `xp.Images` → no image fields, row still maps
- specs with Name/Value round-trip; blank specs omitted

## 4. What this slice does **not** do

- **Promo / coupon.** The existing `components/promo/Promo.tsx` is a CMS marketing block (icon + rich text + link). OrderCloud promotions are a different object on the **order**. Next commerce slice, not this one. Do not hang a promo code field off `CommerceCart` yet.
- **Shipping, tax display beyond today's `taxCost`, address, identity merge.** Keep the anonymous token. When auth-merge lands, swapping the token and bumping `cartRevision` should refresh MiniCart without a redesign.
- **New Sitecore template for a "cart line" or "cart product".** Lines are OrderCloud.
- **New MiniCart rendering item.** Chrome, not a placeable component.
- **Optimistic badge** before `addItem` resolves. Wait for the real cart get after the mutation.
- **Auto-open flyout** on add.
- Changing Stripe line items to include images.

## 5. Implementation order

1. **Mapper** — extract image helper, extend types, map specs, tests.
2. **`CartLineRow` + cart page UI** — product row on `/cart` (and the Sitecore `ShoppingCart` wrapper, which just hosts the helper).
3. **Context revision + `useCommerceCart`** — `AddToCart` mutations become visible elsewhere.
4. **MiniCart** — wrap Navigation utility item; Layout fallback; count + flyout using the same helper.
5. **Author copy** — `dictionaryKeys`, `useTranslations` in the cart helper, English fallbacks.

Do not start MiniCart before (3). A flyout that does not update after add is worse than no flyout.

## Manual Content Editor Instructions

### You do **not** create for this slice

- A Sitecore template for cart line items.
- A MiniCart rendering.
- OrderCloud image fields in Sitecore (images live on the **product in OrderCloud**).
- A ShoppingCart datasource template (unless we reopen Decision D).

### You **should** verify / may already have

| Where | What | Why |
|---|---|---|
| **Pages / Content Editor — Header partial** | Last nav link is **Cart** → `/cart` (or the real cart page path). | MiniCart wraps that utility item. |
| **Pages — Cart page** | Route name/path still matches `isCartRoute` (`cart` / `Shopping Cart`). Either drop `ShoppingCart` into `headless-main` **or** leave main empty and keep the Layout fallback. | Already how the page works. |
| **OrderCloud portal (not Sitecore)** | Products you add to cart have `xp.Images` with `Url` (and `Thumbnailurl` if you want a smaller file). | Seed script already writes this. Catalog products authored only in Sitecore listing items will **not** show a cart thumbnail. |
| **OrderCloud specs** | Specs already persist on the line item from `AddToCart`. Nothing to author for the row to show Size / Color / engraving. | Mapper was dropping them on read. |

### You **must** create for author-owned copy (step 5)

This commerce site's Dictionary is loaded, but there are **no cart keys yet** (no `src/variables/dictionary.tsx` in this starter).

In **Content Editor** (not Pages — dictionary items are usually CE):

1. Open the commerce site item → **Dictionary**.
2. Create a folder, e.g. `Cart`.
3. Create one dictionary item per key in Decision D. **Item name = key** (`CART_Heading`, `CART_EmptyTitle`, `CART_EmptyBody`, `CART_Checkout`, …). Phrase field = the visible string.
4. If the site has `en-CA` (or others), add language versions. Missing keys silently fall back to the English hardcoded defaults in code.

Until those items exist, the UI still works; it just shows the defaults.

### Optional / only if something is missing in CM

Serialized **commerce** module renderings today are `ProductContainer`, `ProductInfo`, `AddToCart`, `SpecForm`. `ShoppingCart` and `Navigation` are **not** under `authoring/items/commerce`. A `ShoppingCart` rendering exists under the older **click-click-launch** path (`componentName: ShoppingCart`, no datasource template).

If the live **SitecoreAI - Commerce** site cannot place `ShoppingCart` or `Navigation`:

1. Create JSON renderings under `/sitecore/layout/Renderings/Project/commerce/` with `componentName` matching the map (`ShoppingCart`, `Navigation`).
2. **No datasource template** on either for this slice.
3. Add them to the placeholder settings authors actually use (`headless-header`, `headless-main`).
4. Put Navigation on the header partial; put ShoppingCart on the cart page *or* rely on Layout's empty-main fallback.

That is environment wiring, not part of the line-item mapper.

### Explicitly later (do not create now)

- Promo code field, promotion datasource, or wiring `Promo` into the cart.
- Checkout identity / merge / shipping components.
- `productDetailPage` on the cart (only if `/products/{id}` is wrong).

## 7. Success criteria

- Cart page row looks like a product: thumbnail from `xp.Images`, selected specs, name links to `/products/{id}`.
- Adding a product on a PDP updates the header count without opening `/cart`.
- Flyout shows the same mapped rows and can checkout or jump to the cart page.
- Heading, empty state, and checkout label are overridable from Dictionary; defaults work with an empty Dictionary.
- No new Sitecore template for lines. Stripe checkout still starts from the same cart payload.
- `npm run test` covers the new mapper cases; cart/nav tests still pass.

## 8. Later slices (parking lot)

**Promo.** OrderCloud promotions / coupon on the unsubmitted order. New mapper fields (`promoCode`, line discounts, order-level discount). UI on cart page first, then flyout. Unrelated to `components/promo/Promo.tsx`.

**Shipping / auth-merge.** Address, rates, anonymous → registered cart merge. Preserve `OrderCloudContext` as the session boundary so MiniCart only has to refresh after a token swap.
