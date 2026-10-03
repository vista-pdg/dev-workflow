---
name: visual-qa
description: Validate rendered UI after modifications with viewport inspection, deterministic screenshots and baseline comparisons, overflow and focus checks, relevant asynchronous states, and automated plus manual accessibility review.
---

# Rendered UI QA

> Never declare a UI improvement complete based only on reading JSX, templates, CSS, or component
> code. Inspect the rendered result whenever the environment permits it.

Read [UI QA commands and constraints](../../workflows/ui-qa.md). Reuse the current app server,
functional E2E suite, and accessibility tools. Playwright here provides visual/accessibility QA;
Cypress remains VISTA's functional E2E suite. If Storybook already exists in a future checkout,
reuse relevant component stories; do not install it just for this workflow.

1. Run the application using its existing scripts or Playwright `webServer`. Open the affected
   route, verify that it is the expected screen, and inspect the rendered result.
2. Test relevant viewport sizes: mobile, tablet, desktop, and either side of changed breakpoints.
   The starter projects cover 390×844, 768×1024, and 1440×900; add targeted sizes only when needed.
3. Take screenshots. Compare with the previous state when a baseline exists and with the updated
   pen target. Stabilize fonts, images, viewport, locale, timezone, fixtures, and animations.
   Control timestamps/random values where relevant; never depend on live external data. Use
   `expect(page).toHaveScreenshot()` with animations disabled. Avoid broad masks that hide the
   actual changed UI. Preserve OS-specific baselines rather than relaxing tolerances.
4. Inspect document and internal scroller overflow, clipping, long content, wrapping, fixed/sticky
   overlaps, and controls at narrow widths and zoom. A screenshot alone cannot establish this.
5. Inspect keyboard focus visibility, tab order, dialogs, selected/disabled/hover states, and
   feedback after interaction. Verify loading, error, validation, and empty states when relevant,
   using controlled fixtures or the existing test backend.
6. Run axe accessibility checks, retaining results for all violations and blocking meaningful
   serious/critical WCAG violations. Do not disable rules to make tests pass. Axe does not replace
   manual review: check keyboard reachability, focus behavior, reading order, accessible names,
   contrast, zoom, and screen-reader semantics where applicable.
7. Run relevant existing typecheck, lint, unit, and Cypress tests. Inspect the actual screenshots
   and diffs with an image/browser tool; passing assertions alone are insufficient visual review.
8. Report regressions before considering the task finished: route, state, viewport, severity,
   expected versus actual behavior, evidence, and any test failure. Fix in-scope regressions;
   disclose unavailable browser/auth/backend/tooling access and unfinished checks. Never claim
   blocked checks passed, invent credentials, or commit authenticated storage or secrets.

Do not automatically accept screenshot updates. For an intentional UI change, first review the
old/actual/diff images against the pen design; only then regenerate the affected baseline and rerun
comparison. Initial baselines document the current UI and do not certify its design quality.
