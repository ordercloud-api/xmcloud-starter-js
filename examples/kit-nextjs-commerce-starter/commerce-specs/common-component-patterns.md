---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
---

# Common Component Patterns (Not Commerce-Specific)

These two patterns show up in every commerce component, but they're general Sitecore Content SDK / `xmcloud-starter-js` conventions rather than something the commerce work introduced. They're documented separately so they don't get mistaken for commerce-specific design decisions when scoping new component specs — new commerce components should follow them because they're the established repo convention, not because commerce invented them.

## 1. Defensive Datasource Field Access

Components reading Sitecore datasource fields use a small local helper trio (`getDatasource`/`getNamedField`/`getFieldValue` in `product-container.props.ts` and `ProductContainer.tsx`):

1. `getDatasource(fields)` — unwraps `fields.data.datasource` if present (GraphQL Layout Service integrated-content shape), else falls back to `fields` directly.
2. `getNamedField(datasource, [names...])` — tries several casings/spacings of a field name (e.g. `productSource` / `ProductSource` / `"Product Source"`) since Sitecore template field names aren't guaranteed to match a single casing convention.
3. `getFieldValue(field)` — unwraps a field that may be a raw value, a `{ value }` shape, or a `{ jsonValue: { value } }` shape.

**Note:** confirmed field schemas (see [templates-and-renderings.md](templates-and-renderings.md)) show the exact-cased names (`Product Source`, `Product ID`, `Preview Product ID`) are what's actually authored in the live environment — the extra casing fallbacks in `getNamedField` are defensive-only and don't currently match anything different.

**Gap to flag:** related field-unwrapping logic still exists in more than one product-detail file and could be extracted into a shared utility.

## 2. Editor/Authoring-Safe States

Every component follows the same state machine before rendering its "real" UI, keyed off `page.mode.isEditing || page.mode.isDesignLibrary` (`isAuthoring`):

- **Missing required context** (e.g. `ProductInfo`/`AddToCart` rendered outside a `ProductContainer`) → visible dashed-border warning box in authoring, `null` at runtime.
- **Loading** (`loading-session` / `loading-product`) → skeleton/pulse placeholder with `aria-live="polite"`.
- **Configuration error / not found / error** → authoring shows a specific actionable message (e.g. "Configure Product Source and its corresponding product ID on ProductContainer."); runtime renders `null` (never a broken UI for site visitors).
- **Ready** → real component UI, always with a `data-component="ComponentName"` attribute for test/debug hooks, and `id={params.RenderingIdentifier}` + `className={params.styles}` wired through from rendering parameters.

**Pattern to reuse:** new components (commerce or otherwise) should implement this same status ladder rather than ad hoc loading/error handling, and should never render a visibly broken state to end users — only to authors.
