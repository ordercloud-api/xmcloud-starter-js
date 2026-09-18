---
initiative: commerce-starter-spec
created: 2026-09-17
author: row_sitecore
status: implemented
---

# `ProductList`

## Summary

`ProductList` is the production-oriented OrderCloud catalog component and replaces the legacy `ProductListing` implementation.

- **Registration name:** `ProductList`
- **Server wrapper:** `src/components/product-list/ProductList.tsx`
- **Client experience:** `src/components/commerce/OrderCloudProductList.tsx`
- **Product source:** OrderCloud only; the Sitecore datasource stores presentation and behavior settings, never product records.
- **Product links:** built from the authored `Product Detail Page Path` rendering parameter and each OrderCloud product ID. The component does not infer a route when this is empty.

## Editor controls

The component opens its rendering properties after it is added. All behavior controls live in the `ProductList Parameters` rendering-parameters template. The runtime accepts both display labels with spaces and the compact item-name form emitted by Sitecore (for example, `Sort Options` and `SortOptions`).

| Editor label               | Sitecore field type | Default           | Options / behavior                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Show Filters`             | Checkbox            | Off               | When enabled, displays the facet groups returned by OrderCloud. Selections are combined with search text and sent back to the product-list API as `xp.<XpPath>` filters.                                                                                                                      |
| `Show Search Bar`          | Checkbox            | Off               | When enabled, displays a product search input. Typing is debounced by 300 ms before querying OrderCloud.                                                                                                                                                                                      |
| `Show Sort`                | Checkbox            | On                | When enabled, displays the editor-defined shopper sort control and honors URL sort state. When disabled, the component applies the first authored `Sort Options` entry and ignores URL sort state.                                                                                           |
| `Sort Options`             | Multi-Line Text     | —                 | Defines one shopper-visible option per line as `Display label=Sort expression`. The authored order is preserved and the first line is the initial selection. Leave the expression empty for no `sortBy`; use commas for multi-field sorts. Blank values produce no sort control; Pages warns authors when `Show Sort` is enabled without valid options. |
| `Search Placeholder`       | Single-Line Text    | `Search products` | Placeholder shown inside the search input. It has no effect when `Show Search Bar` is off.                                                                                                                                                                                                    |
| `Pagination Style`         | Droplist            | `Standard`        | Blank and `Standard` both display result metadata plus Previous, numbered-page, and Next buttons. `Infinite Scroll` automatically requests and appends the next page as the shopper nears the end. Only the explicit `None` option fetches the first configured page and hides pagination.     |
| `Results Per Page`         | Integer             | `12`              | Products requested per page. Runtime validation clamps the authored value to 4–48. It also controls the first-page limit when `Pagination Style` is `None`.                                                                                                                                   |
| `Maximum Products Per Row` | Integer             | `3`               | `2`–`6`. Sets the widest-screen column ceiling. Narrow screens and containers automatically use fewer columns, and card width remains design-capped.                                                                                                                                         |
| `Catalog ID`               | Single-Line Text    | —                 | Optional OrderCloud catalog scope. When authored, this value is baked into every request and is never written to the shopper URL. When empty, the request omits `catalogID`. There is no catalog environment-variable fallback.                                                              |
| `Category ID`              | Single-Line Text    | —                 | Optional category scope. When authored, it is baked into every request and never written to the shopper URL. OrderCloud's default `depth=all` behavior includes descendants.                                                                                                                  |
| `Initial Search Term`      | Single-Line Text    | —                 | Default search when the URL has no explicit search value. With the search bar hidden it remains a baked-in query constraint. With the bar shown, shoppers can edit or explicitly clear it; an empty `search=` URL value preserves that choice.                                                 |
| `Product Filters`          | Multi-Line Text     | —                 | One `Field=Value` filter per line. Simple filters matching returned Product Facets become normal URL-backed, removable facet selections. Non-facet and complex expressions remain baked into every request and are not affected by Clear all.                                                |
| `Product Detail Page Path` | Single-Line Text    | `/products`       | Internal product-detail path used as the base for product-card links. Authors see a configuration hint when this is empty in Pages; the public site does not show the hint. A text field is used because Pages rendering parameters do not reliably support General Link/page-picker editors. |

Pages renders this template as a static property form. It does not conditionally hide `Search Placeholder` when `Show Search Bar` is off; the runtime simply ignores the placeholder in that state. Conditional editor behavior would require a custom Pages field editor rather than template configuration.

Recommended `Sort Options` standard value:

```text
Default product order=
Featured=!xp.Featured
Name: A–Z=Name
Name: Z–A=!Name
Price: low to high=xp.Price
Price: high to low=!xp.Price
```

## Shopper behavior

- Authored Catalog ID and Category ID values are sent with the effective search, baked-in Product Filters, selected facets, current page, page size, and sort order. Empty catalog and category values are omitted, and neither scope ever appears in the URL.
- `Product Filters` uses one `Field=Value` entry per line. Repeating a field produces OrderCloud AND semantics; `|` within a simple value produces OR semantics. Invalid lines stop the product request and produce an authoring diagnostic rather than silently broadening the catalog.
- When facets are enabled, the component discovers the available OrderCloud facet definitions before applying authored filters. A simple authored filter whose key matches a facet is promoted to normal selected-facet state, written to the URL, and removable. Negation, wildcard, comparison, empty, and repeated-key expressions stay baked in because the checkbox UI cannot faithfully represent them.
- Clear all removes shopper selections and promoted authored facet defaults. It never removes hidden non-facet or complex Product Filters. An empty URL value records that an authored facet default was explicitly cleared so it is not restored on reload.
- Values selected within one facet are joined with OrderCloud's OR syntax; selections across different facets and baked-in filters remain ANDed.
- Facet choices discovered in the current session stay visible when a filtered response narrows its facet metadata, allowing shoppers to select another value from the same facet.
- Search, sort, standard-pagination page, and repeated facet values are stored in the URL so filtered results can be shared and browser Back/Forward restores them. Pages authoring URLs are never modified.
- A URL sort is accepted only when its expression matches one of the currently authored `Sort Options`. Missing or unrecognized URL values fall back to the first authored option.
- Changing the search term, sort order, or a facet selection resets the component to page 1.
- Active filters appear as removable chips with a shared Clear all action. On small screens, facets open in a dismissible Filters drawer instead of occupying the space above results.
- The search input uses a conventional search icon with a screen-reader label and an in-field clear action. Sort labels and OrderCloud expressions are fully editor-defined; the recommended Featured option sorts descending on `xp.Featured`.
- Standard pagination reports the visible range (for example, `Showing 13–24 of 57 products`) and moves focus back to the results after a page change.
- Infinite scroll starts loading the next page when its sentinel is within 600 px below the viewport, permits only one page advance per completed request, and de-duplicates appended products by ID.
- Shopper-facing states use separate facet and product-card skeletons, a neutral temporary-unavailability message, and a no-results message. The prior developer-oriented live-data label and Retry control are not part of this component.

## OrderCloud facet contract

The seed script owns three demo Product Facets and the matching product XP values:

| Facet        | Product Facet `XpPath` | Product XP              |
| ------------ | ---------------------- | ----------------------- |
| Brand        | `Facets.Brand`         | `xp.Facets.Brand`       |
| Product Type | `Facets.ProductType`   | `xp.Facets.ProductType` |
| Activity     | `Facets.Activity`      | `xp.Facets.Activity`    |

The product service normalizes OrderCloud `Meta.Facets` into the component's internal facet model. The seed script upserts these explicitly owned facet definitions without deleting unrelated Product Facets.

## Phase boundary

The legacy `ProductListing` registration and implementation have been removed. Existing Sitecore layouts must use the `ProductList` rendering name.
