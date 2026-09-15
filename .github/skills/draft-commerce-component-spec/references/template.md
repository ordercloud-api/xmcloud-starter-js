# Draft Spec Templates

Two templates: one for a Sitecore-registered component, one for a non-registered helper. Copy the relevant one, fill it in, delete unused sections rather than leaving placeholders. Match the level of detail in existing specs (e.g. `product-container.md`, `helpers/product-spec-fields.md`) — cite actual field/type names, not generic descriptions.

## Registered component template

```markdown
---
initiative: commerce-starter-spec
created: <YYYY-MM-DD>
author: <author>
status: draft
---

# `<ComponentName>`

> Part of [../index.md](../index.md). Draft — not yet implemented / not yet confirmed against a live Sitecore template. <Link to ProductContainer or other dependencies, e.g.: "Must be rendered inside a [ProductContainer](../product-container.md)." >

## Summary

<One paragraph: what it renders, why it exists, what it depends on.>

- **Proposed location:** `src/components/<kebab-case-name>/<ComponentName>.tsx` (+ `<kebab-case-name>.props.ts` if it reads Sitecore fields directly)
- **Rendering type:** server | client
- **Variants:** <list, or "Default only">
- **Would register as:** `<ComponentName>` in `.sitecore/component-map.ts` (server or client map)

## Sitecore template/rendering (proposed — not yet confirmed)

| Field | Type | Source |
|---|---|---|
| ... | ... | ... |

State explicitly whether a Datasource Template exists yet, or whether this component is expected to be a pure leaf rendering (context/props only, like `AddToCart`/`SpecForm`/`ProductInfo`).

## Manual Content Editor Instructions

Concrete, numbered steps for whoever has CM access to make this component usable — write these as literal instructions a content author/developer can follow in the live Sitecore environment, not just a restatement of the field table above. Registering the component in code (`.sitecore/component-map.ts`) is a code step covered elsewhere in this spec/implementation — don't repeat it here.

1. Create the datasource template `/sitecore/templates/Project/commerce/<ComponentName>` (or confirm reuse of an existing one) with the fields listed above.
2. Create the rendering item `/sitecore/layout/Renderings/Project/commerce/<ComponentName>`, set its Datasource Template/Location, and set the componentName to `<ComponentName>`.
3. <Any Placeholder Settings entries needed, e.g. if this component renders a placeholder of its own.>
4. <Any droplist/lookup source items needed for authored fields.>
5. <Any Standard Values defaults to set.>
6. Add the rendering to a placeholder on a page in Pages/Content Editor to confirm it resolves and is authorable end to end.

If this component has no Datasource Template (a pure leaf rendering, like `AddToCart`/`SpecForm`/`ProductInfo`), say so explicitly instead of omitting this section — e.g. "No new Sitecore items required — add the rendering to a placeholder inside a `ProductContainer` page; there's no datasource item to author for this component."

## Props / datasource shape

<TypeScript-shaped description of fields/props, following the `getDatasource`/`getNamedField`/`getFieldValue` defensive-access convention from common-component-patterns.md if it reads Sitecore fields directly.>

## Behavior

<Step-by-step: what it resolves, what context it reads/provides, what it renders per state. Reuse the container+context pattern (if applicable) and the editor/authoring-safe state ladder (missing context / loading / configuration-error / not-found / error / ready) from common-component-patterns.md.>

## OrderCloud model(s)/service(s) involved

<Which SDK types (e.g. `BuyerProduct`, `Spec`, `LineItem`) and/or OrderCloud API resources this touches, and what was confirmed from `https://ordercloud.io/api-reference` vs. what's inferred.>

## Known gaps / open questions

- ...
```

## Helper component template

```markdown
---
initiative: commerce-starter-spec
created: <YYYY-MM-DD>
author: <author>
status: draft
---

# `commerce/<ComponentName>` (helper)

> Part of [../../index.md](../../index.md). Draft — proposed helper, not independently registered in `.sitecore/component-map.ts`. Consumed by [<the component that uses it>](../<component-name>.md) or, if drafted alongside a new registered component, its sibling draft.

## Summary

<What it renders/does, and why it's a separate helper rather than inlined into the component that uses it.>

- **Proposed location:** `src/components/commerce/<ComponentName>.tsx`
- **Rendering type:** server | client
- **Depends on:** <contexts, services, other helpers>

## Props

| Prop | Type | Default | Purpose |
|---|---|---|---|
| ... | ... | ... | ... |

## Behavior

<Data loading, rendering states, key resolution logic. Reuse existing helper conventions where applicable — e.g. the 10s request timeout + AbortController pattern in `OrderCloudProductList`, or the presentation-XP fallback pattern in `ProductSpecFields`.>

## OrderCloud model(s)/service(s) involved

<Same as the component template — cite SDK types and/or API reference pages consulted.>

## Known gaps / open questions

- ...
```
