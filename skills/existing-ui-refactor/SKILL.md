---
name: existing-ui-refactor
description: Refine existing product UI, polish screens, refactor visual presentation, fix visual inconsistencies, or improve UX, responsiveness, hierarchy, spacing, density, and typography while preserving the established visual language. Use before substantial UI changes, not for greenfield design.
---

# Existing UI refinement

This is an existing product, not a greenfield design. Refine the product's existing visual
language rather than replacing it.

## Inspect before changing UI

1. Locate the application and read applicable repository instructions, package manifests,
   scripts, design references, and tests. Run `git status` in affected repositories. Do not assume
   a framework, package manager, component library, or CSS solution.
2. Inspect the affected screen, neighboring screens, and shared primitives in code and in the
   browser. Record the current state at relevant viewports before editing.
3. Identify the typography and spacing scales, color tokens and semantic colors, border radii,
   borders, shadows, container widths, breakpoints, icon usage, recurring layouts, component
   primitives, page shells, forms, tables, navigation patterns, empty/loading/error states,
   and interactive states (hover, focus, selected, disabled, pending, validation).
4. Distinguish **intentional visual variation** (different purpose or documented pattern) from
   **accidental inconsistency** (the same role implemented differently without a reason).
   Cite neighboring examples and token definitions; missing evidence is uncertainty, not a
   license to normalize every screen.
5. For VISTA, read `frontend/DESIGN.md`, `frontend/src/index.css`, and the relevant parts of
   `../hu-workflow/references/design-system.md` relative to this skill. Live tokens and current
   rendered behavior take precedence over stale examples; the pen design records the agreed
   target. Explain conflicts rather than silently replacing either system.

## Design, then implement

Before **every UI change**, use [the pen workflow](../../workflows/pen-ui.md) to inspect and update
the affected frames in the versioned `pen/vista_design.pen`. Preserve unrelated frames and the
existing visual language. Include responsive layouts and relevant interactive and asynchronous
states. The user has explicitly required this step for all UI changes, including small fixes.
If tools or file access are unavailable, report the blocker and keep UI implementation pending;
continue inspection and planning that do not depend on it.

Use `web-design-guidelines` for review, adapting its tool names to the current agent's available
fetch/browser tools. Its recommendations inform refinement; they do not authorize replacing
VISTA's tokens, branding, or components. When offline, disclose that current guidelines could
not be fetched and use local evidence.

Choose the **smallest coherent change that materially improves the UI**. Prioritize:

1. Information hierarchy
2. Spacing and alignment
3. Typography hierarchy
4. Visual density
5. Component consistency
6. Interaction feedback
7. Responsive behavior
8. Accessibility
9. Decorative styling

Blocking accessibility requirements still apply throughout. Reuse existing tokens, primitives,
icons, shells, and form/navigation conventions. Preserve routes, business behavior, auth, data
contracts, and user-requested scope. Note unrelated defects separately. Extend an existing
component only when it solves the concrete problem without forcing intentional variants together.

## Anti-patterns

Do not introduce by default: gradients, glassmorphism, arbitrary shadows, excessive rounded cards,
nested cards everywhere, decorative pills, giant hero typography inside application screens,
generic SaaS-dashboard styling, random accent colors, a new font, a second icon library,
unnecessary animations, excessive blur, decorative background blobs, floating panels without
functional purpose, or "premium" dark surfaces for no reason. These may be used only when clearly
part of the application's existing visual language. Do not add a UI library or migrate the design
system to achieve a local polish task.

> Do not make the interface look "more designed" for its own sake. Make it clearer, calmer,
> easier to scan, and more internally consistent.

## Close the loop

Use `visual-qa` after implementing. Inspect rendered results against both the previous state and
the pen target, verify relevant states and viewports, and review screenshot diffs before accepting
baselines. Report what changed, why, evidence, and remaining limitations. Do not call the work
complete from source inspection alone.
