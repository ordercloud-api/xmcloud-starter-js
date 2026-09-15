---
name: sync-commerce-component-spec
description: 'Reconcile examples/kit-nextjs-commerce-starter component spec files in commerce-specs/component-specs/ against the actual current code in src/, so specs written before/without this workflow (or gone stale since) match reality. Use when asked to sync, reconcile, audit, catch up, or "shore up" commerce component specs against code; to check if a spec is stale or out of date; to update a spec after code changed without the spec being touched; or to find commerce components that exist in code but have no spec at all. Does not implement code (see draft-commerce-component-spec for that) and never hand-edits templates-and-renderings.md.'
argument-hint: 'Component name to reconcile, or "all" to sweep every spec in component-specs/, e.g. "sync product-listing" or "audit all commerce specs"'
---

# Sync Commerce Component Spec

Brings already-existing spec files under `examples/kit-nextjs-commerce-starter/commerce-specs/component-specs/` back in line with what the code in `examples/kit-nextjs-commerce-starter/src/` actually does today. Code is the source of truth for this skill — the opposite direction of [draft-commerce-component-spec](../draft-commerce-component-spec/SKILL.md), which is spec-first. This exists to catch up specs against code that was pushed before spec authoring started (or between spec updates), not to replace the spec-first workflow going forward.

## When to Use

- Asked to sync/reconcile/audit/"shore up" specs against current code.
- Suspect a spec is stale (code changed, spec wasn't updated to match).
- After a batch of commits/PRs landed in `examples/kit-nextjs-commerce-starter/src/` without corresponding spec edits.
- Want to find components implemented in code with no spec at all yet.

Not for: drafting a spec for a brand-new component that doesn't exist in code yet (use `draft-commerce-component-spec`), or hand-editing `templates-and-renderings.md` (only ever updated via a live Sitecore CLI serialization pull — flag suspected drift there, don't edit it).

## Inputs to Gather (ask only what's missing)

- One specific component name, or "all" to sweep every promoted spec.
- Whether newly-discovered undocumented components (code exists, no spec) should just be listed/flagged, or handed off to `draft-commerce-component-spec` to draft. Default: flag only, don't draft — drafting is that skill's job and needs the user's input on shape/placement.

## Procedure

1. **Build the comparison set:**
   - Specs: every `*.md` directly under [component-specs/](../../../examples/kit-nextjs-commerce-starter/commerce-specs/component-specs/) and `component-specs/helpers/`, **excluding** anything under a `drafts/` folder (those aren't promoted yet — out of scope for this skill).
   - Code: every registered rendering in `.sitecore/component-map.ts` (or the client component map) plus every helper under `src/components/commerce/` in `examples/kit-nextjs-commerce-starter/`.
   - If the user named one component, narrow both sides to just that component (+ its paired helper, if any, per the spec's cross-links).

2. **Match specs to code, and flag anything that doesn't pair up:**
   - Spec exists, code exists → reconcile (step 3).
   - Code exists, no spec (not even a draft) → flag as "undocumented"; do not write a spec for it (that's `draft-commerce-component-spec`'s job) unless the user explicitly confirmed hand-off in step 0.
   - Spec exists, code no longer exists (component removed/renamed) → flag as "orphaned spec"; ask the user before deleting or archiving it.

3. **For each paired spec+code, reconcile using [commerce-component-patterns.md](../../../examples/kit-nextjs-commerce-starter/commerce-specs/commerce-component-patterns.md) and [common-component-patterns.md](../../../examples/kit-nextjs-commerce-starter/commerce-specs/common-component-patterns.md) as the shared vocabulary:**
   - Read the spec's Props/datasource shape section against the component's actual prop/datasource types in code (its `.props.ts`/`.props.tsx` sidecar or inline interface). Update the spec where they differ; note in your final report which fields were added, removed, or retyped.
   - Read the spec's Behavior section against what the code actually does: does it still follow the container+context pattern, the three-way source-resolution model, and the editor/authoring-safe state ladder the way the spec claims? Update the prose to match reality — don't silently "correct" the code's behavior in the writing, describe what's really there.
   - Check the spec's file path(s)/location references against where the code actually lives; fix stale paths.
   - Re-check the spec's "Known gaps / open questions" section: remove gaps the code has since closed, add new gaps you observe, leave unrelated open questions alone.
   - Leave the Manual Content Editor Instructions section and Sitecore template/rendering field lists alone unless you have direct evidence (not a guess) that they're wrong — flag suspected drift there instead and suggest the user run `dotnet sitecore ser pull -i commerce` to refresh [templates-and-renderings.md](../../../examples/kit-nextjs-commerce-starter/commerce-specs/templates-and-renderings.md), then re-run this skill.
   - Update the frontmatter only if it has a `status` or similar field that's now clearly inaccurate (e.g. marked `draft` when it's long since implemented) — ask the user if the right value is unclear; don't invent a status vocabulary.

4. **Update navigation** in [component-specs/index.md](../../../examples/kit-nextjs-commerce-starter/commerce-specs/component-specs/index.md) only if reconciliation changed a component's name, path, or status — not for routine content edits.

5. **Never** touch `templates-and-renderings.md` in this skill, for any reason — it's populated exclusively by a live Sitecore CLI serialization pull.

## Output

Report back, grouped by component: which specs were updated and what specifically changed (props/behavior/paths/gaps), which components were flagged as undocumented (code with no spec) or orphaned (spec with no code), and any suspected Sitecore schema drift the user should resolve via a fresh CLI pull. End by asking whether any flagged undocumented components should be handed off to `draft-commerce-component-spec`.
