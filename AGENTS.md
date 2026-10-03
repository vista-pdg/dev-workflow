# VISTA agent instructions

This repository holds shared workflows, skills, user stories, and the pen design, not the
application. The workspace has five independent Git repositories: `backend`, `frontend`,
`dev-workflow`, `terraform-backend` (Terraform support resources), and `terraform-iac` (workload
cloud resources). Paths are relative to this checkout or its sibling repositories; discover
their actual locations. Inspect `git status` in each affected repository and preserve user changes.
Keep the existing CI/CD and package-manager conventions. Frontend CI and documentation use npm;
the additional `bun.lock` does not authorize switching package managers.

For user stories, use [hu-workflow](skills/hu-workflow/SKILL.md) and its references. Track phases
with your agent's task tools or a short progress record in the HU spec. Push/PR approval rules
are defined there. This setup does not authorize a redesign or a future feature implementation.

## UI refinement

These instructions apply to frontend work when this shared context is loaded. Use
`npm run agents:link -- --target ../frontend` to expose the same context at frontend scope.

This is an existing product, not a greenfield redesign. Before modifying UI:

- Inspect neighboring screens and existing components; identify existing tokens and patterns.
- Preserve recognizable product identity; distinguish inconsistency from intentional variation.
- Reuse existing primitives whenever possible. Avoid new visual concepts when the current system
  can solve the problem.
- Use [existing-ui-refactor](skills/existing-ui-refactor/SKILL.md) before substantial changes,
  [web-design-guidelines](skills/web-design-guidelines/SKILL.md) for UI review, and
  [visual-qa](skills/visual-qa/SKILL.md) after any UI changes.
- **Before every UI change, inspect and update the relevant design in `pen/vista_design.pen`
  using pen CLI or MCP**, including affected states and viewport layouts. Follow
  [the pen workflow](workflows/pen-ui.md). If pen is unavailable, continue read-only inspection
  and report the blocker before implementing UI. Never edit an encrypted `.pen` as text.

Prioritize: hierarchy → spacing and alignment → typography → density → consistency →
interaction feedback → responsiveness → accessibility → decorative styling. Accessibility
requirements remain mandatory; this ordering is not permission to defer a blocking defect.

Do not make the interface look "more designed" for its own sake.
Make it clearer, calmer, easier to scan, and more coherent.

Rendered verification and explicit review of screenshot differences are required when available.
Never update baselines solely to silence a failure. See [UI QA](workflows/ui-qa.md) for commands,
authentication limitations, platform-specific snapshots, and manual checks. No Storybook is
installed; do not add it for routine refinement.
