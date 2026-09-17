---
initiative: commerce-starter-spec
created: 2026-09-16
author: row_sitecore
status: draft
---

# Cart product row, header mini-cart, author-owned copy

> Part of [../index.md](../index.md). **Draft** — tasks 1–2.5 are in code; 4 (header slots + CartButton) is next; 3 and 5 are later. Cross-cutting slice. Extends [helpers/order-cloud-cart.md](../helpers/order-cloud-cart.md) and [add-to-cart.md](../add-to-cart.md). CartButton rendering: [cart-button.md](cart-button.md). Archive rules: [../../README.md](../../README.md).

One slice, implemented **in this order**. Promo codes and shipping/auth-merge are explicitly later and must not expand this work.

This is a **mapper + UI** slice against the cart the starter already has. It does **not** add a Sitecore template for line items. Task 4 **does** add a `CartButton` JSON rendering (no datasource). Author copy uses dictionary — see [Manual Content Editor Instructions](#manual-content-editor-instructions).

## Session handoff (2026-09-17)

**Start the next session at Task 4** (Navigation logo/right placeholders + [CartButton](cart-button.md)). Do not re-do mapper, cart row, or `CartPage` identity. **Do not start Task 3** in the same change set — the bag is a link, not a live count.

| Task | Status | What shipped |
|---|---|---|
| 1 Mapper | **done** | `products/images.ts`; cart types + `toCommerceCart` map `xp.Images` and `Specs` |
| 2 Cart row UI | **done** | `CartLineRow` (full + unused `compact`); `cart/format.ts`; `/cart` uses the row |
| 2.5 Cart nav identity | **done** | `cart/destination.ts`; Navigation partitions by `CartPage`; cart control is a **sibling** of the primary list; no `isUtility` / last-item split |
| 3 `cartRevision` + `useCommerceCart` | parked | Shared snapshot so AddToCart refreshes other cart surfaces. Needed before a flyout/count. |
| 4 Header slots + CartButton | **next** | Navigation logo + right placeholders; CartButton is a **link** to `/cart` with `ShowCartLink`. No flyout. |
| 5 Dictionary copy | not started | `dictionaryKeys` + English fallbacks |
| later MiniCart flyout | parked | After Task 3. Compact `CartLineRow`. Do not copy SYNC's empty MiniCart. |

**CM already done (do not re-hunt Parameters Template):** this Content Editor does **not** show Parameters Template on Json/SXA renderings. Live Navigation **Parameters** string is `CartPage=/cart`. Code reads `CartPage` / `Cart page` from component params (and from that Parameters string). Default href is `/cart` if empty. A `Navigation Parameters` template with a Cart page General Link was created under `Templates/Project/commerce/Rendering Parameters` but is **not wired** to the rendering — ignore it unless a later session serializes Parameters Template.

**Do not**

- Treat the last nav link as Cart.
- Add a MiniCart Sitecore rendering or a `showMiniCart` checkbox with no flyout.
- Copy SYNC `MiniCart.tsx` (hardcoded empty cart).
- Start a flyout or count badge before Task 3.
- Point `CartPage` at `/checkout` (Stripe return URLs).
- Invent a Logo component — drop the existing **Image** rendering in the logo slot.

**Task 4 entry points:** `Navigation.tsx` (server shell + placeholders); `getCartDestination` / `partitionNavigationItems`; new `cart-button/CartButton.tsx`. Spec: Decision C (revised) + [cart-button.md](cart-button.md).

**Task 3 (later) entry points:** `OrderCloudContext` / `useOrderCloud().cart`; `AddToCart`; `commerce/ShoppingCart`. Spec: Decision A.

**On promote:** fold cart-row bits into `helpers/order-cloud-cart.md`; promote [cart-button.md](cart-button.md) as its own inventory row; add `helpers/mini-cart.md` only if a flyout helper ships. Then delete this draft.

## Current state (what we are extending)

| Piece | After tasks 1–2.5 | Still open |
|---|---|---|
| Cart mapper | Maps `xp.Images` + `Specs` onto optional `imageUrl` / `thumbnailUrl` / `specs`. | — |
| Cart UI | `CartLineRow` on `/cart` (thumb, specs, PDP name link, qty, remove). Hardcoded English. | Dictionary (task 5); compact density unused until MiniCart |
| Sitecore wrapper | Unchanged leaf `shopping-cart/ShoppingCart`. | — |
| Cart page | Layout empty-main fallback; `isCartRoute` also honors authored `CartPage` path segment. | — |
| Add to cart | “View cart” href from `getCartDestinationFromRoute`. Still **does not notify** other cart UIs. | Task 3 `cartRevision` |
| Header | Cart-role item pulled by `CartPage` (default `/cart`), sibling of primary `<ul>`, button chrome. No count, no flyout. | Task 4: logo + right placeholders; CartButton replaces that sibling |
| Shared cart state | None. Each cart surface independently calls `cart.get()`. | Task 3 |

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

**Recommendation: extract `CartLineRow` from `commerce/ShoppingCart`. Full page = comfortable row. Flyout = compact row. Same mapped item.**

- **Location:** `src/components/commerce/CartLineRow.tsx` (helper, excluded from the component map).
- **Money / spec labels:** `src/lib/commerce/cart/format.ts` (`formatMoney`, `lineTotal`, `toCartItemSpecLabels`).

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

### Decision C — Header slots + CartButton (revised 2026-09-17)

**Recommendation: Navigation is a header shell with two dynamic placeholders. CartButton is a placeable leaf in the right slot.**

This replaces the earlier “MiniCart wraps the cart-role nav item, not a rendering” recommendation. Authors asked for logo/right placeholders and a cart button they can configure in Content Editor. SYNC `HeaderST` is the precedent (logo + nested `AppPlaceholder` + cart control). Do **not** copy SYNC `MiniCart.tsx`.

```
nav
  AppPlaceholder  navigation-logo-{DynamicPlaceholderId}
  ul#primary      Home, Products, …  — authored order, minus cart-role
  AppPlaceholder  navigation-right-{DynamicPlaceholderId}
```

- **Logo slot:** drop the existing **Image** rendering (`Image` + `TargetUrl` for home). Constrain size in the slot. No new Logo component.
- **Right slot:** drop **CartButton**. Stays visible on mobile (not behind Menu). Later Account/search can share this slot.
- **Stop rendering the Task 2.5 cart-role sibling.** Keep `partitionNavigationItems` so a Cart page still in the nav tree is not duplicated in primary. Empty right slot = no bag (authoring hint only).
- **CartButton** is a registered rendering — see [cart-button.md](cart-button.md). Always a **link** to `CartPage` / `/cart`. `ShowCartLink` shows or hides the visible title. No count, no flyout, no `showMiniCart` param.
- Placeholders use `DynamicPlaceholderId` like `ProductContainer` (`product-container-{id}`) and HeaderST (`header-navigation-{id}`). Navigation needs `IsRenderingsWithDynamicPlaceholders=true`.
- `AppPlaceholder` lives on a **server** Navigation wrapper. Keep the Menu toggle in a client child — today's `'use client'` file cannot host the placeholders.

**Later (after Task 3):** a flyout/count can replace or wrap CartButton's inner control. Still not a MiniCart rendering. Still not the last nav link.

### Decision E — Cart nav identity (do this before MiniCart)

**The current `isUtility` path is a layout hack, not a contract.** `splitPrimaryAndUtilityItems` peels the last authored link, then `isUtility` means three unrelated things at once: “sit on the right”, “look like a button”, and “this is Cart”. Authored order is not identity. If someone adds Account after Cart, Account inherits the chrome. If Cart is not last, it looks like Home. SXA `Styles` tokens like `last` / `item1` are the same position heuristic with extra CSS classes — do not key MiniCart off those.

Also the DOM is wrong for a bag: Cart is an `<li>` inside the same collapsible `<ul>` as Home/Products. On mobile the “button” disappears behind Menu. `md:ml-auto` is compensating for stuffing session chrome into the IA list.

**Recommendation: give the cart link a role, a slot, and (later) a control — three names, not one boolean.**

| Concern | What owns it | Not this |
|---|---|---|
| **Identity** — this link *is* the cart | Navigation **Parameters** string `CartPage=/path` (or GUID). Match by Id then href. | Last child, SXA `last`, DisplayName, Parameters Template hunt, hardcoded `/cart` as the only truth |
| **Slot** — where it sits in the header | Task 2.5: sibling of primary `<ul>`. Task 4: **right** `AppPlaceholder` (always visible, including mobile) | `md:ml-auto` on the last `<li>` |
| **Chrome** — how it looks / behaves | Task 2.5: button-looking `Link`. Task 4: **CartButton** in that slot. Flyout later wraps CartButton after Task 3 | Styling a generic “utility” link |

**Why a URL convention is not enough**

`/cart` is only the starter default. If the page is `/basket`, last-segment matching misses it. If someone points the bag at `/checkout`, it also collides with this starter’s hosted checkout routes (`/checkout/success`, `/checkout/cancel`) — that must be an authoring warning, not something code treats as a synonym for cart.

A checkbox on the Cart **page** also is not enough. That field is on the route you are viewing. Navigation on Home/PDP never receives it: the Headless Navigation resolver only emits `Id`, titles, `Href`, `Querystring`, `Children`, `Styles`. Arbitrary page fields do not travel with the tree.

**Identity (Pages + code):**

1. **Source of truth:** Navigation rendering **Parameters** (the visible text field, or Pages Additional parameters). Key `CartPage` (also `Cart page`). Value is a path (`/cart`, `/basket`) or a page item GUID. Match the nav node by **Id** when the value is a GUID, otherwise by normalized href. Caption still comes from that nav node.
2. **Default when the param is empty:** `/cart` so the starter runs before anyone sets it.
3. **One destination, many consumers.** `getCartDestination` / `getCartDestinationFromRoute` feed nav partition, Layout `isCartRoute`, and AddToCart “View cart”. Do not leave a second hardcoded `"/cart"` island.
4. `isCartNavItem` — **No last-item fallback.** No match → primary links only.
5. At most one cart-role item.

Content Editor in this CM does **not** show Parameters Template on Json/SXA renderings (including AddToCart). Do not hunt for that field. Set `CartPage=/cart` on the rendering’s **Parameters** string instead. A Pages General Link picker would need serialization to assign Parameters Template; that is optional later, not required for 2.5.

**Slot (DOM):**

Replace last-`<li>`-in-the-list with a partition:

```
nav
  bar
    Menu button          (mobile)
    ul#primary           Home, Products, …  — authored order, minus cart-role
    CartNavControl       sibling, trailing — the cart-role item (or nothing)
```

`partitionNavigationItems` returns `{ primary, cart }`. Cart is **pulled out** of the list wherever the author put it. Adding About after Cart does not steal the slot. Putting Cart first still parks it on the right.

Until Task 4, `CartNavControl` is still the Sitecore `Link` (title + href authored), with the current border/padding classes applied because the **role** is cart — not because `isUtility` is true. Delete `isUtility` / `splitPrimaryAndUtilityItems`.

**Task 4 replaces that control** with the right placeholder + CartButton. Partition remains so Cart does not re-enter the primary list.

**What we are explicitly not architecting**

- A generic “utility” slot based on last-child. Account / search later get their **own** roles or sit in primary.
- A MiniCart Sitecore rendering. CartButton is the placeable; a flyout is later chrome on that control.
- A “this is the cart” checkbox on the **page template** as the site-wide signal (it does not appear on nav nodes on other pages).
- Hardcoded `/cart` as the only identity, or DisplayName `"Cart"`.
- CSS `li:last-child`.
- Treating `/checkout` as cart. Checkout in this starter is Stripe hosted return URLs, not the bag.

**Content Editor / Pages (this is the one new authoring surface):**

1. On the Navigation **rendering** (Feature Headless or Project copy), set **Parameters** to `CartPage=/cart` (or `/basket`). Publish. This CM does not show Parameters Template.
2. The Cart page can sit anywhere under Home. It does not have to be the last nav link.
3. Empty param still defaults to `/cart` in code.

Do this as **Task 2.5 before Task 4**. Wrapping a bag around “the last link” would freeze the hack into the header.

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
2. Run the shared `getProductImages` / `toProductHeroImage` helpers (`lib/commerce/products/images.ts`, extracted from the product mapper so PDP and cart cannot drift) on `asRecord(row.Product?.xp)`.
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
- **New MiniCart rendering item.** Count/flyout later wrap CartButton; they are not a second placeable. CartButton itself **is** a rendering (Task 4).
- **Optimistic badge** before `addItem` resolves. Wait for the real cart get after the mutation.
- **Auto-open flyout** on add.
- Changing Stripe line items to include images.

## 5. Implementation order

1. **Mapper** — extract image helper, extend types, map specs, tests.
2. **`CartLineRow` + cart page UI** — product row on `/cart` (and the Sitecore `ShoppingCart` wrapper, which just hosts the helper).
2.5. **Cart nav identity** — `CartPage` on Navigation Parameters string; `getCartDestination`; partition by href/id; cart control sibling of the primary list. `isUtility` / last-item split removed. No MiniCart yet.
3. **Context revision + `useCommerceCart`** — parked until a count/flyout needs it. `AddToCart` mutations stay local until then.
4. **Header slots + CartButton** — Navigation logo + right placeholders; CartButton link with `ShowCartLink`. Stop auto-rendering the cart-role sibling. See [cart-button.md](cart-button.md).
5. **Author copy** — `dictionaryKeys`, `useTranslations` in the cart helper, English fallbacks.

Do not start a flyout before (3). A flyout that does not update after add is worse than a plain cart link.

## Manual Content Editor Instructions

Do **not** create a cart-line template, a MiniCart rendering, Sitecore image fields for OrderCloud products, or a ShoppingCart datasource template.

### Task 1 — Mapper (done)

**Nothing in Content Editor.** Thumbnails and specs are read from the OrderCloud line item (`Product.xp.Images`, `Specs`). There is no new Sitecore item to create, and no Pages change that would make this mapper visible.

Optional OrderCloud-only check if a cart row has a name but no image:

1. Open the **OrderCloud portal** (not Sitecore) → Products.
2. Open a product you will add to the cart.
3. Confirm `xp.Images` has at least one object with `Url`. Optional `Thumbnailurl` (smaller file) and `Primary: true` (hero). Demo seed often sets `Thumbnailurl` to the same value as `Url`.
4. Do **not** put that image on a Sitecore `productThumbnail` field — cart rows never read it.

### Task 2 — Cart product row UI (done)

Still no new template. Confirm the **Cart page** in Pages:

1. Open the commerce site in **Sitecore Pages**.
2. Open the Cart page (item name/path contains `cart` or display name **Shopping Cart** — must match `isCartRoute`).
3. If `headless-main` is empty, the Layout fallback already renders the cart — leave it, or drop the `ShoppingCart` rendering into `headless-main`.
4. **No datasource** on `ShoppingCart`. If Pages asks you to pick one, cancel; this rendering is a leaf.
5. Preview, add a product from a PDP, open `/cart`. You should see thumbnail + specs + a name link to `/products/{id}`. If the name shows but no image, check OrderCloud `xp.Images` — it is not a Sitecore field miss.
6. If the name link 404s, the Products page still needs a **wildcard child** (`*`) with `ProductContainer` in last-url-segment mode. Creating `/products` alone is not enough for `/products/{id}`.

### Task 2.5 — Cart nav identity (done)

**What actually shipped in CM:** on the live Navigation rendering, **Parameters** = `CartPage=/cart`. This CE never showed Parameters Template (AddToCart / SpecForm included). A `Navigation Parameters` template exists under `Templates/Project/commerce/Rendering Parameters` but is unused.

**Code:** `src/lib/commerce/cart/destination.ts`. Navigation reads `getCartDestination(params)` and `partitionNavigationItems`. Layout / AddToCart use `getCartDestinationFromRoute`.

To change the bag URL later: edit that Parameters string (`CartPage=/basket`), publish, do not point at `/checkout`.

### Task 3 — Shared cart snapshot (parked)

**Nothing in Content Editor.** Wire `cartRevision` (or a snapshot) on `OrderCloudContext` so `addItem` / `updateItem` / `removeItem` refresh every cart surface. Extract `useCommerceCart()` for the cart page (and later the flyout). See Decision A.

Do not build this in the same change set as Task 4.

### Task 4 — Header slots + CartButton (next)

Code: Navigation placeholders + [cart-button.md](cart-button.md). Then in **Content Editor** / **Pages**:

1. On the live **Navigation** rendering, set **OtherProperties** to `IsRenderingsWithDynamicPlaceholders=true` (same as ProductContainer). Publish.
2. Under `/sitecore/layout/Placeholder Settings/Project/commerce/`, add:
   - `navigation-logo-{*}` — allow **Image**.
   - `navigation-right-{*}` — allow **CartButton**.
3. Create the **CartButton** JSON rendering (`componentName: CartButton`, no datasource). See [cart-button.md](cart-button.md) CE steps for `ShowCartLink` / Parameters string.
4. In **Pages**, open the **header partial**. Drop **Image** (home `TargetUrl`) into the logo slot. Drop **CartButton** into the right slot.
5. Confirm Navigation **Parameters** still includes `CartPage=/cart`. Do not point at `/checkout`.
6. Optional: remove Cart from the nav item tree so it is not sitting unused in the partition.
7. Do **not** add a MiniCart rendering. Do **not** add a Logo component — Image is enough.

### Task 5 — Author-owned copy (not yet)

Do this in **Content Editor**, not Pages. Dictionary items are under the site, not on the cart rendering.

1. In Content Editor, expand the commerce **site item** → **Dictionary**.
2. Insert a folder named `Cart` (right-click Dictionary → Insert → Folder, or the Dictionary folder insert option your site uses).
3. Under `Cart`, insert one **Dictionary entry** per key. **Item name must match the key exactly** (this is what `next-intl` / `getDictionary` looks up):

   | Item name | Phrase (en) |
   |---|---|
   | `CART_Heading` | Shopping Cart |
   | `CART_EmptyTitle` | Your shopping cart is empty |
   | `CART_EmptyBody` | Add a product, then come back here to check out. |
   | `CART_Checkout` | Checkout |
   | `CART_CheckoutStarting` | Starting checkout… |
   | `CART_ViewCart` | View cart |
   | `CART_ContinueShopping` | Continue shopping |
   | `CART_Remove` | Remove |
   | `CART_Loading` | Loading cart… |
   | `CART_ItemCount_one` | `{count} item` |
   | `CART_ItemCount_other` | `{count} items` |

4. On each item, set the **Phrase** (or equivalent dictionary value field) to the English string above.
5. If the site has `en-CA` (or other languages), switch language on each item and add a version with the translated Phrase. Missing languages fall back to the hardcoded English in code.
6. Publish the Dictionary folder (or wait for Edge to pick it up). Until these items exist, the UI still runs on those English defaults.

### If ShoppingCart / Navigation cannot be placed in this CM

Serialized **commerce** module renderings today are `ProductContainer`, `ProductInfo`, `AddToCart`, `SpecForm`. `ShoppingCart`, `Navigation`, and `CartButton` are **not** under `authoring/items/commerce` until someone creates them in CM and pulls. A `ShoppingCart` rendering exists under the older **click-click-launch** path (`componentName: ShoppingCart`, no datasource template).

Only if the live **SitecoreAI - Commerce** site cannot insert those renderings:

1. In Content Editor, create JSON renderings under `/sitecore/layout/Renderings/Project/commerce/`.
2. Set **componentName** to `ShoppingCart` and `Navigation` (must match the component map).
3. Leave **Datasource Template** empty on both.
4. Allow them on `headless-header` / `headless-main` in Placeholder Settings.
5. Put Navigation on the header partial; put ShoppingCart on the cart page *or* rely on Layout's empty-main fallback.

### Do not create (any task in this slice)

- Promo code field, promotion datasource, or `Promo` on the cart.
- Checkout identity / merge / shipping components.
- `productDetailPage` on the cart (only if `/products/{id}` is later wrong).

## 7. Success criteria

- Cart page row looks like a product: thumbnail from `xp.Images`, selected specs, name links to `/products/{id}`.
- Header bag is a CartButton in Navigation's right slot; logo slot hosts Image. Both are authored, not hardcoded last-nav hacks.
- CartButton navigates to `/cart` (or authored `CartPage`). `ShowCartLink=0` hides the visible title; the control still has an accessible name.
- No count badge and no flyout until Task 3. Adding a product does **not** yet update a header count (honest gap).
- Heading, empty state, and checkout label are overridable from Dictionary once Task 5 lands; defaults work with an empty Dictionary.
- No new Sitecore template for lines. Stripe checkout still starts from the same cart payload.
- `npm run test` covers mapper cases plus nav placeholders / CartButton href; cart/nav tests still pass.

## 8. Later slices (parking lot)

**MiniCart flyout.** After Task 3. Compact `CartLineRow`, count = sum of quantities, Checkout + View cart. Not a Sitecore rendering. Do not copy SYNC's empty MiniCart.

**Checkout success / order detail.** After middleware for the hosted-checkout callback. Out of this header slice.

**Promo.** OrderCloud promotions / coupon on the unsubmitted order. New mapper fields (`promoCode`, line discounts, order-level discount). UI on cart page first, then flyout. Unrelated to `components/promo/Promo.tsx`.

**Shipping / auth-merge.** Address, rates, anonymous → registered cart merge. Preserve `OrderCloudContext` as the session boundary so MiniCart only has to refresh after a token swap.
