---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# Templates & Renderings (`kit-nextjs-commerce-starter`)

Confirmed Sitecore template/rendering schemas for the commerce components, pulled via Sitecore CLI serialization directly from the connected XM Cloud `dev` CM environment (project "SitecoreAI - Commerce"). This is the ground truth for what's actually authored/authorable today — later specs should confirm against this rather than re-deriving it from code alone.

> For the component inventory (what components exist, where, and their specs), see [component-specs/index.md](component-specs/index.md). For the reusable architecture/design patterns and best practices behind these components, see [commerce-component-patterns.md](commerce-component-patterns.md). For general (non-commerce-specific) `xmcloud-starter-js` conventions, see [common-component-patterns.md](common-component-patterns.md).

## Confirmed Template/Rendering Schemas (Live Environment)

Pulled via Sitecore CLI serialization from the `dev` CM environment (project "SitecoreAI - Commerce"), scoped to `/sitecore/templates/Project/commerce`, `/sitecore/layout/Renderings/Project/commerce`, and `/sitecore/layout/Placeholder Settings/Project/commerce`. This confirms the field names used throughout these docs.

**`ProductContainer` rendering** (`/sitecore/layout/Renderings/Project/commerce/ProductContainer`):
- `componentName`: `ProductContainer`
- Datasource Template: `/sitecore/templates/Project/commerce/ProductContainer`
- Datasource Location: `query:./*[@@name='Data']|query:$site//*[@@name='Data']|query:$sharedSites//*[@@name='Data']`
- `OtherProperties`: `IsRenderingsWithDynamicPlaceholders=true` — confirms the dynamic-placeholder pattern described in [commerce-component-patterns.md](commerce-component-patterns.md) §1
- Linked to the Placeholder Settings item at `/sitecore/layout/Placeholder Settings/Project/commerce`
- Parameters Template has no custom fields beyond the base rendering parameters (`styles`, `RenderingIdentifier`)

**`ProductContainer` datasource template** (`/sitecore/templates/Project/commerce/ProductContainer`, section "Settings"):
| Field | Type | Source |
|---|---|---|
| `Product Source` | Droplist | `/sitecore/System/Settings/Project/commerce/Product Sources` |
| `Product ID` | Plugin (custom OrderCloud product picker) | field-type id `d232ba1e-40fe-46c5-915a-2f46d0df87f5` |
| `Preview Product ID` | Plugin (same custom picker) | field-type id `d232ba1e-40fe-46c5-915a-2f46d0df87f5` |

Standard Values default: `Product Source` = `OrderCloud Picker`. **This confirms the code's exact-cased field names (`Product Source`, `Product ID`, `Preview Product ID`) are what's actually authored — the camelCase/PascalCase fallback variants in `getNamedField` never match real content in this environment; they're defensive-only.**

**`AddToCart` / `ProductInfo` / `SpecForm` renderings** — none have a Datasource Template, confirming they're pure leaf renderings with no Sitecore-authored fields of their own (everything comes from `ProductDataContext`). Their Parameters Templates have no custom fields **except** `SpecForm Parameters`, which has one:
| Field | Type | Source |
|---|---|---|
| `DefaultOptionControl` | Droplist | `Dropdown\|Buttons` |

This is the rendering-parameter default described in `docs/spec-form.md` (see [commerce-component-patterns.md](commerce-component-patterns.md) §3).

**`ProductListing`** — **not present** under either `/sitecore/templates/Project/commerce` or `/sitecore/layout/Renderings/Project/commerce` in this environment. Confirmed gap (see [commerce-component-patterns.md](commerce-component-patterns.md) §5): either it's serialized under a different module/path not yet pulled, or it hasn't been created as a real item in this environment yet.

**Placeholder Settings** (`/sitecore/layout/Placeholder Settings/Project/commerce`) — exists as a folder-level item only; no child placeholder-key entries were captured in this pull. The runtime placeholder key (`product-container-{DynamicPlaceholderId}`) is generated dynamically by the component rather than requiring one static Placeholder Settings entry per instance, but a settings entry for the placeholder *pattern* itself may exist as a child item — worth a follow-up pull if placeholder icon/editing behavior needs documenting.

## Next Step

See [commerce-component-patterns.md](commerce-component-patterns.md) for the architecture/design patterns behind these schemas, and [component-specs/index.md](component-specs/index.md) for the component inventory and per-component specifications (one file per component, helpers grouped separately).
