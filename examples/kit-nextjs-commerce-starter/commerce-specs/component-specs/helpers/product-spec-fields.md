---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
source: https://github.com/ordercloud-api/xmcloud-starter-js/tree/feature/commerce-starter/examples/kit-nextjs-commerce-starter
---

# `commerce/ProductSpecFields` (helper)

> Part of [../../index.md](../../index.md). See [../../commerce-component-patterns.md](../../commerce-component-patterns.md) §3 for the data/presentation split this component implements, and `docs/spec-form.md` in the source repo for the original XP contract. Used exclusively by [../spec-form.md](../spec-form.md) — `SpecForm` owns the loading/error/empty container states; this component owns the actual field rendering for each OrderCloud Spec.

## Summary

Renders one form control (or two, for an "open text" option) per OrderCloud Spec, driven by Spec/Spec-Option XP for presentation and validation. This is the most XP-configurable component in the inventory — control type, labels, help text, placeholders, prefixes/suffixes, swatch colors/images, and badges are all optionally overridable per spec/option without any code change.

- **Location:** `src/components/commerce/ProductSpecFields.tsx` (named export `ProductSpecFields`, plus `resolveDefaultOptionControl`)
- **Rendering type:** client (`"use client"`)
- **Depends on:** `lib/commerce/products/specs.ts` (`productSpecOptionControls`, `resolveDateConstraint`, and the `CommerceProductSpec*`/`ProductSpec*` types)

## Props

| Prop | Type | Purpose |
|---|---|---|
| `specs` | `CommerceProductSpec[]` | Normalized specs for the current product (see [types](#spec-data-model)). |
| `selections` | `ProductSpecSelections` (`Record<specId, { optionId?, value? }>`) | Current selection state, owned by `ProductDataContext`. |
| `errors` | `Record<specId, string>` | Validation error messages, keyed by spec ID. |
| `defaultOptionControl` | `"dropdown" \| "buttons"` | Component-wide default from [`SpecForm`](../spec-form.md); overridden per-spec by `spec.presentation.control` when present. |
| `currency` | `string?` | Passed through to price-markup formatting. |
| `disabled` | `boolean` | Currently always `false` when called from `SpecForm` (see that spec's known gaps). |
| `onChange` | `(specId, selection) => void` | Forwards to `ProductDataContext.updateSelection`. |

## Spec data model (`lib/commerce/products/specs.ts`)

`CommerceProductSpec`: `{ id, name, required, allowOpenText, definesVariant, defaultOptionId?, defaultValue?, options: CommerceProductSpecOption[], presentation, validation }`.

`CommerceProductSpecOption`: `{ id, name, isOpenText, priceMarkupType?, priceMarkup?, presentation }`.

`presentation.control` (spec-level): one of `productSpecOptionControls` = `dropdown | buttons | radio | swatches | images | cards`.
`presentation.textControl`: one of `productSpecTextControls` = `text | textarea | number | date`.
`presentation` also carries `label`, `helpText`, `placeholder`, `prefix`, `suffix`.
`validation`: `min`, `max`, `step`, `minLength`, `maxLength`, `minDate`, `maxDate` (dates: `"today"` or `YYYY-MM-DD`, validated by regex in `safeDateConstraint`).
Option-level `presentation`: `label`, `description`, `color` (hex, validated by regex), `imageUrl` (must be `http(s)://` or a root-relative path — `safeImageUrl` rejects anything else, e.g. blocking `javascript:` URLs), `badge`.

All XP is defensively parsed — malformed/missing XP silently falls back to sane defaults (component default control, OrderCloud option `name`) rather than throwing or rendering broken markup.

## Per-spec rendering (`ProductSpecFields`)

For each spec:

1. `optionControl = spec.presentation.control` if it's one of the six valid `productSpecOptionControls`, else `defaultOptionControl`.
2. `showOpenText` = true if the spec has **no** options and `allowOpenText`, **or** the currently-selected option is itself flagged `isOpenText` (an "Other, please specify" style option).
3. Renders a `<fieldset>` with a `<legend>` (spec label + a visual `*` if required, `aria-hidden` since `required` is also expressed via the control's `required` attribute), optional help text (`aria-describedby`-linked), the option control (if `options.length > 0`), the open-text control (if `showOpenText`), and any validation error (`role="alert"`, `aria-describedby`-linked).

## `OptionChoices` — the six option controls

| Control | Layout | Notes |
|---|---|---|
| `dropdown` | native `<select>` | Empty option text differs by required-ness ("Select {label}" vs "No selection"); each `<option>` label includes formatted price markup in parentheses. |
| `radio` | vertical list | Includes an explicit "No selection" radio when the spec isn't required. |
| `buttons` | `flex flex-wrap` pill buttons | Toggleable: clicking the already-selected button clears it, unless `spec.required`. |
| `swatches` | `flex items-center gap-2 rounded-full` row | Renders `option.presentation.color` as a background color and/or `imageUrl` inside a circular swatch. |
| `images` | 2/4-column grid | Renders `option.presentation.imageUrl` as a square image above the label. |
| `cards` | 1/2-column grid, larger padding | Same content as `images`/`buttons` but roomier "card" styling. |

`buttons`/`swatches`/`images`/`cards` share one underlying button-grid implementation (`layoutClasses`/`optionClasses` computed from `control`), all rendering via the shared `OptionDetails` sub-component (image/swatch + label + optional badge + optional description/markup).

`formatMarkup(option, currency)`: returns `undefined` for `NoMarkup`; `"+N%"`/`"-N%"` for `Percentage`; an `Intl.NumberFormat` currency string with a forced sign (`signDisplay: "always"`) for amount-based markups, suffixed `" each"` for `AmountPerQuantity`. Falls back to a plain signed number string if `Intl` throws.

## `OpenTextControl`

Renders based on `spec.presentation.textControl` (default `"text"`): `<textarea>` for `textarea`, otherwise an `<input>` of that HTML type (`text`, `number`, `date`). Applies `min`/`max`/`step` (number) or `min`/`max` resolved via `resolveDateConstraint` (date — turns `"today"` into today's actual date string), plus `minLength`/`maxLength`. `required` is true if the spec itself is required **or** an open-text-flagged option is currently selected. When `prefix`/`suffix` are configured, wraps the input in a bordered flex container with prefix/suffix chips (e.g. `$` / `each`).

## Known gaps

- `disabled` is threaded through every control but, as noted in [../spec-form.md](../spec-form.md), is never actually set to `true` by the current caller — dead prop in practice today.
- `formatMarkup`'s currency formatting duplicates logic similar to `formatPrice` in [ProductInfo](../product-info.md) and [OrderCloudProductCard](order-cloud-product-card.md) — a shared money-formatting utility would consolidate all three (see that component's known gaps for the same observation).
- No client-side re-validation as the user types in an open-text control beyond native HTML constraint attributes (`minLength`/`maxLength`/`min`/`max`) — actual validation errors are computed centrally in `ProductDataContext`/`AddToCart`, not here.
