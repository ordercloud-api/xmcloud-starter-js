# Commerce specs archive

This folder is the **checked-in spec archive** for `kit-nextjs-commerce-starter`. Specs are versioned in git with the starter. They are not stored in Confluence or generated at build time.

Lifecycle (spec-first SDLC):

```
draft  →  execute (code)  →  human test (incl. Content Editor steps)  →  promote
```

| Path | What lives here |
|---|---|
| [`_overview.md`](_overview.md) | Initiative overview and success criteria |
| [`commerce-component-patterns.md`](commerce-component-patterns.md) | Shared commerce architecture (container+context, sources, XP) |
| [`common-component-patterns.md`](common-component-patterns.md) | Repo-wide conventions (datasource access, authoring states) |
| [`templates-and-renderings.md`](templates-and-renderings.md) | **Read-only.** Confirmed CM schemas from `dotnet sitecore ser pull -i commerce`. Never hand-edit. |
| [`component-specs/`](component-specs/index.md) | Promoted component inventory — source of truth for what already shipped |
| [`component-specs/drafts/`](component-specs/drafts/) | New work **before** it is implemented and tested |
| [`component-specs/helpers/`](component-specs/helpers/) | Promoted non-registered helpers |
| [`component-specs/helpers/drafts/`](component-specs/helpers/drafts/) | New helper drafts |

Agent skills that enforce this:

- [draft-commerce-component-spec](../../../.github/skills/draft-commerce-component-spec/SKILL.md) — write drafts, implement them, promote after the user confirms testing
- [sync-commerce-component-spec](../../../.github/skills/sync-commerce-component-spec/SKILL.md) — reconcile **promoted** specs with current `src/` (ignores `drafts/`)

## Rules

1. **New specs start in `drafts/`.** Add a `(draft)` row to [`component-specs/index.md`](component-specs/index.md). Do not drop new files next to promoted specs, and do not invent sibling folders (`slices/`, `wip/`, etc.).
2. **Cross-cutting slices** (one unit of work that updates several existing surfaces, e.g. cart mapper + cart page + header chrome) are still **one draft file** under `component-specs/drafts/`. On promote, fold the draft into the affected promoted specs (and add helper files if a new helper shipped), then remove the draft.
3. **Implementation does not promote.** Code can land while the spec stays in `drafts/` until someone has tested it (authoring/preview and live) and completed any Manual Content Editor Instructions.
4. **Never write `templates-and-renderings.md` from a spec workflow.** Refresh it only from a live serialization pull.
5. **`sync-commerce-component-spec` skips `drafts/`.** Stale drafts get updated during execute (code vs draft) or by editing the draft directly.

## Current drafts

See the **Drafts** table in [`component-specs/index.md`](component-specs/index.md).
