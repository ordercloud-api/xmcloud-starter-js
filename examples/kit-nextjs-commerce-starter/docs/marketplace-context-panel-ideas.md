# Pages Context Panel — Marketplace App Idea (Draft)

Rob's idea: activate a Pages context panel marketplace app when a commerce component is selected in the canvas, and surface OrderCloud data relevant to that component instead of building custom fields. Needs a sharper "what" before looping in Crhistian/Todd/Jeff — draft use cases below, plus an SDK feasibility read against `@sitecore-marketplace-sdk/client` (already a dependency in `kit-nextjs-commerce-starter`).

## Draft use cases

1. **Product/variant lookup on selection.** Author selects a Product Card or Product Detail rendering; panel shows the bound OrderCloud product (SKU, price, inventory, active variants) pulled live from OrderCloud, so the author can verify data without leaving Pages.
2. **Catalog/category picker as a panel action.** Author selects a Product Grid/Collection component; panel lets them browse OrderCloud catalogs/categories and pick which one feeds that component, instead of hand-entering a catalog ID in a custom field.
3. **Order/checkout config at a glance.** Author selects a Checkout or Cart component; panel shows which Stripe/OrderCloud buyer client config applies to the current site/environment (read-only diagnostic, similar to the existing `/checkout/readiness` check) so authors can self-serve "why isn't checkout working here."

All three start as **read-only** — they display OrderCloud data keyed off the selected component, without needing to write anything back.

## Feasibility read (SDK types, `@sitecore-marketplace-sdk/client` + `/core`)

- **App type exists.** `xmc:pages-contextview` / `xmc:pages:contextpanel` is a real, typed app type (`AppType`, `XmcPagesContextViewHostState`) — the panel activation mechanism itself is supported.
- **Context available is page-level, not component-level.** `pages.context` (query) returns `siteInfo` + `pageInfo` — full page/item metadata (id, path, template, fields, permissions). There is **no field or property identifying which rendering/component instance is currently selected** on the canvas in the current type defs.
- **Change notifications are item/field-level, not rendering-level.** The two subscribe events, `pages.content.layoutUpdated` and `pages.content.fieldsUpdated`, carry `itemId` + `language` + `itemVersion`, and for fields: `fieldId`/`value`/`originalValue`. No rendering/datasource identifier is included — so "which specific component got edited" isn't directly derivable when a page has multiple instances of the same rendering.
- **No write-back mutation found.** The only mutations in scope are `pages.reloadCanvas` and `pages.context` (which sets/queries context, not content). There's no mutation to patch a field or datasource value from the panel.

**Bottom line:** use case 1-3 above (read-only, page-level context) look feasible today. Rob's original concern — reacting to *which specific commerce component* is selected, and writing changes back — is **not clearly supported** by the current SDK types. Worth a direct question to Crhistian/Sitecore marketplace team: is component/rendering-level selection context and field write-back on the roadmap, or exposed via an API not reflected in these type defs?

## Suggested next step

Take the 3 use cases + the "page-level only, no write-back" finding to Crhistian (or Rob E) as a concrete yes/no: *can the Pages context panel react to component selection and/or write field values, beyond what's in the public SDK types?*
