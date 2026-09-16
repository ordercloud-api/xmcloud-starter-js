---
initiative: commerce-starter-spec
created: 2026-09-15
author: row_sitecore
status: draft
---

# Commerce Starter Spec

## Problem Statement

Create a detailed specification of the commerce components for `xmcloud-starter-js`, covering template / rendering definitions, reusable component patterns, and best practices. An MVP already exists on a branch of the source repo — the first phase of this initiative is to reverse-engineer a baseline spec from that existing work before defining any new component specifications.

## Source Material

MVP reference (not a formal PRD — to be reverse-engineered into a spec):

- **Repo:** [ordercloud-api/xmcloud-starter-js](https://github.com/ordercloud-api/xmcloud-starter-js)
- **Branch:** `feature/commerce-starter`
- **Example to examine:** `kit-nextjs-commerce-starter`
- **Relevant folders/files:**
  - `components/product-listing`
  - `components/product-info`
  - `components/add-to-cart`
  - `components/product-container`
  - `components/commerce` (React components)

## Affected Domains & Services

- **xmcloud-starter-js** (`ordercloud-api/xmcloud-starter-js`, branch `feature/commerce-starter`) — source of the existing commerce MVP, specifically `examples/kit-nextjs-commerce-starter`.
- Commerce domain: OrderCloud (products, specs, cart, checkout) integrated into a Sitecore XM Cloud / Content SDK Next.js App Router site.

## Baseline (reverse-engineered from the MVP)

See [templates-and-renderings.md](templates-and-renderings.md) for confirmed template/rendering schemas from the live environment, [component-specs/index.md](component-specs/index.md) for the component inventory, and [commerce-component-patterns.md](commerce-component-patterns.md) for the container+context architecture pattern, product-source resolution, the XP-driven data/presentation split used by `SpecForm`, best practices, and open gaps to resolve before/while writing new component specs.

See [common-component-patterns.md](common-component-patterns.md) for two patterns used throughout the commerce components that are general `xmcloud-starter-js` conventions rather than commerce-specific: defensive datasource field access, and editor/authoring-safe states.

Per-component specifications, one markdown file per component from the inventory (helpers grouped under their own subdirectory), live under [component-specs/](component-specs/index.md). How specs are archived and promoted: [README.md](README.md).

## Success Criteria

- [x] Baseline spec documenting the existing MVP commerce components (template/rendering definitions, reusable patterns, conventions used) — see [templates-and-renderings.md](templates-and-renderings.md), [component-specs/index.md](component-specs/index.md), and [commerce-component-patterns.md](commerce-component-patterns.md)
- [x] Per-component specifications — see [component-specs/](component-specs/index.md)
- [ ] New component specifications defined on top of that baseline — first draft: [component-specs/drafts/cart-row-minicart-copy.md](component-specs/drafts/cart-row-minicart-copy.md)

## System Interaction Diagram

```mermaid
graph TD
```
