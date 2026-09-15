---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# Commerce Component Patterns

Commerce-specific reusable patterns and best practices established by the existing MVP (`kit-nextjs-commerce-starter`), plus open gaps to resolve before/while writing new component specs.

> For the component inventory, see [component-specs/index.md](component-specs/index.md). For confirmed template/rendering schemas, see [templates-and-renderings.md](templates-and-renderings.md). For general (non-commerce-specific) `xmcloud-starter-js` conventions, see [common-component-patterns.md](common-component-patterns.md) instead of looking for them here.

## 1. Architecture Pattern: Container + Context, Not Prop Drilling

`ProductContainer` is the composition root for a single product's UI:

- Resolves **which** product to show (see §2, Product Source Resolution) from its own Sitecore datasource fields (`Product Source`, `Product ID`, `Preview Product ID`).
- Wraps children in `ProductDataProvider` (`src/contexts/ProductDataContext.tsx`), which owns all async state: product load, spec load, spec selections, validation errors.
- Renders a **dynamic placeholder** (`AppPlaceholder` from `@sitecore-content-sdk/nextjs`, named `product-container-{DynamicPlaceholderId}`) so authors can drop any combination of child renderings inside it.
- Children (`ProductInfo`, `AddToCart`, and presumably future components like a spec form or gallery) never receive product data as props — they call `useProductContext()` themselves.

This is the core reusable pattern: **a container component owns data-fetching + shared state via React Context; leaf components are Sitecore renderings that consume that context and are agnostic of how the data was sourced.** New commerce components that need product data should plug into `ProductDataContext` rather than accepting product fields as component props.

Cross-cutting contexts:
- `OrderCloudContext` — anonymous OrderCloud session/auth (token acquisition + retry, stored via `lib/commerce/auth/token-store`), exposes `products`, `cart`, etc. services.
- `ProductDataContext` — single-product state (load status, spec list, spec selections, validation) scoped under one `ProductContainer`.
- `RoutePathContext` — exposes the current Sitecore route segments so `ProductContainer` can resolve a product ID from the URL (see §2).

## 2. Reusable Pattern: Product Source Resolution

Two independent "source" abstractions decide where product data comes from, both normalized through permissive string-matching helpers (`normalizeProductSource`, `normalizeProductListSource` in `lib/commerce/products/reference.ts` / `list-source.ts`) so CMS field values like `"OrderCloud Picker"`, `"picker"`, `"Sitecore"`, `"Treelist"`, `"CMS"` all resolve correctly:

- **Single product** (`ProductContainer` → `ProductSource`): `"last-url-segment"` (product ID comes from the last segment of the current route, falling back to a `Preview Product ID` while authoring) or `"ordercloud-picker"` (product ID comes from a picked reference field).
- **Product list** (`ProductListing` → `ProductListSource`): `"sitecore"` (render CMS-authored product items from a Sitecore datasource), `"ordercloud-catalog"` (live list from OrderCloud), or `"ordercloud-picker"` (specific OrderCloud product IDs selected by an author). Falls back to `"sitecore"` if Sitecore products exist in the datasource, otherwise `"ordercloud-catalog"`.

**Pattern to reuse:** any new commerce component that lists or targets products should accept the same three-way source model (CMS-authored / live catalog / manually picked) rather than inventing a new one, and should normalize the source value defensively since it comes from free-form CMS field data.

## 3. Reusable Pattern: Data/Presentation Split via XP (Extended Properties)

`SpecForm` / `ProductSpecFields` (see `docs/spec-form.md` in the source repo, copied context below) separate **commerce data** from **CMS-controlled presentation**:

- OrderCloud Spec data (options, price markup type/amount, required-ness) stays in OrderCloud.
- Presentation is controlled by OrderCloud Spec/Spec-Option XP (`presentation.control`, `presentation.textControl`, `label`, `helpText`, `placeholder`, swatch `color`/`imageUrl`, `badge`, etc.) and can be overridden per-spec or per-option.
- A rendering-parameter-level default (`DefaultOptionControl`) sets the component-wide default control (e.g. dropdown vs. buttons), exposed to authors as a Design-tab variant (`SpecForm.Buttons`) rather than a raw custom field, because SitecoreAI Pages doesn't expose arbitrary rendering-parameter fields in its standard Design panel.
- Supported option controls: `dropdown`, `buttons`, `radio`, `swatches`, `images`, `cards`. Supported open-text controls: `text`, `textarea`, `number`, `date`.
- Validation (`required`, `min`/`max`/`step`, `minLength`/`maxLength`, `minDate`/`maxDate`) is enforced centrally in `ProductContainer`'s shared state; `AddToCart` only reads the resulting `areSpecSelectionsValid` flag and stays disabled until it's true.

**Pattern to reuse:** for any new component exposing OrderCloud-sourced choices to authors, prefer XP-driven presentation overrides over new custom rendering parameters, and centralize validation in the container/context rather than in the leaf component.

## 4. Best Practices Already Established in the Source Repo

From the source repo's own `copilot-instructions.md`, `docs/Skills.md`, and `Skills.md` (example-level), which should carry forward into any new spec:

- **Component registration:** every Sitecore-rendered component must be registered in a component map (server or client) under the same name used in the layout; don't rename/remove registrations without updating layout usage.
- **Data strategy:** fetch layout/page data at the route level (catch-all page) only — never inside child components; client components must receive only serializable props (no functions/class instances) — hence the Context-based approach for commerce state instead of passing services as props.
- **Field rendering:** always use Sitecore field components (`<Text>`, `<RichText>`, `<Image>`, `<Link>`) for CMS-editable content instead of manual value extraction, to preserve in-context editing.
- **Editing & preview:** don't alter HTML structure around editable fields in ways that break editor selection/overlays; keep server/client split aligned with what's editor-critical.
- **Routing:** the catch-all route remains the single entry point for CMS-driven pages; no parallel static routes for CMS-managed paths.
- **Project structure:** `src/components/<kebab-case-name>/<PascalCaseComponent>.tsx` (+ a co-located `*.props.ts` for typed field/datasource shapes when a component reads Sitecore fields directly, e.g. `product-listing.props.ts`, `product-container.props.ts`).
- **Security:** sanitize/validate all external input at the boundary (applies to CMS field values and OrderCloud responses alike), never expose secrets client-side, escape content to prevent XSS.

## 5. Known Gaps / Open Questions for New Component Specs

- The `getDatasource`/`getNamedField`/`getFieldValue` trio should likely be extracted into a shared `lib` module rather than re-implemented per component — see [common-component-patterns.md](common-component-patterns.md), this isn't commerce-specific.
- `ProductListing` variants (`ThreeUp`, `Slider`) are currently identical aliases of `Default` — no actual layout differentiation yet; a real spec is needed if these are meant to render differently.
- ~~No formal Sitecore template/rendering item definitions...~~ **Resolved** — see [templates-and-renderings.md](templates-and-renderings.md), pulled directly from the live `dev` CM environment via Sitecore CLI serialization.
- `ProductListing` has no corresponding template/rendering item in the environment we pulled from ([templates-and-renderings.md](templates-and-renderings.md)) — confirm with whoever owns the live instance whether it's serialized elsewhere or simply not yet created as a real Sitecore item.
- `OrderCloudCart` exists as a component but is not wired into `.sitecore/component-map.ts` — confirm whether it's intentionally test-only (used on `/oc-test`) or meant to become a registered rendering.
- Checkout flow (Stripe redirect in `OrderCloudCart`) is out of scope for the components called out so far but exists in the codebase — confirm whether checkout components belong in this spec's scope.

## Next Step

With the inventory and patterns both captured, per-component specifications (one file per component/feature, building on the commerce-specific patterns in §1–§3 above and the general conventions in [common-component-patterns.md](common-component-patterns.md)) live under [component-specs/](component-specs/index.md).
