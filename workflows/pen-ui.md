# Pen before every UI change

The user requires the existing versioned `pen/vista_design.pen` to be inspected and updated
**before every frontend UI change**, including polish, responsive fixes, and new states. An audit
with no implementation may stay read-only. This infrastructure task does not change the design.

Use the installed pen CLI or the connected `pencil` MCP; do not install or generate a competing
design. Resolve paths from the checkout, never an account-specific document UUID. `.pen` files are
encrypted: do not read, grep, hand-edit, or decode them with ordinary file tools.

## CLI path (Linux and macOS)

Check `pen --help` and `pen interactive --help` for the installed version. The interactive shell
is the supported mode for agents calling design tools directly; it does not require spawning a
second AI agent or choosing a model.

From `dev-workflow`, headless mode opens the existing file and directs output to that same file:

```bash
pen interactive --in pen/vista_design.pen --out pen/vista_design.pen
```

For read-only inspection or a candidate draft, use a temporary output path instead and do not
save over the versioned file. For an installed desktop app, the documented alternative is
`pen interactive --app desktop --in pen/vista_design.pen`.

Inside the interactive shell:

```javascript
read_skill()
read_skill({ path: "pen-schema.md" })
read_skill({ path: "execute.md" })
get_app_state()
```

Follow the returned schema and execute instructions, not remembered syntax. Inspect the root
frames and affected subtree with read-only `Get`/`Print` operations before mutations. Verify the
document path and VISTA frame identity, then modify only the relevant frames. Inspect screenshots
with `TakeScreenshot`/`Export` using the returned documentation. Finish an authorized design edit
with `save()` and `exit()`. Read-only inspection ends with `exit()` without `save()`.

`pen login` authenticates pen.dev; `pen codex-login` separately authenticates Codex for the CLI's
AI-agent mode. Configuring a Codex account does not by itself establish the pen.dev session.
Both are machine-local setup when needed, never checked into Git. No credentials, workspace
slugs, account paths, or MCP tokens belong in this repository.

## MCP path

Discover the available `pencil` tools in the current agent. Start with `get_app_state` and
`read_skill`, then read the referenced schema and execute documentation. MCP may require the
file to be open in the pen editor. Verify that the **active canvas** is the versioned VISTA file
before the first write and again after a document/window change; `filePath` alone is insufficient
with editor-connected tools. Pass the intended file path explicitly when the tool schema allows it.

MCP edits can remain unsaved in the desktop editor. Verify that the versioned `.pen` appears
modified in `git status`; an execute success is not proof of disk persistence. Save via the editor
or the documented interactive CLI `save()` (after `pen login` when required). Never reopen the
on-disk file over an unsaved canvas to attempt saving it.

Do not mutate a different active canvas. If no editor file is open, try the configured CLI path;
if neither path can access VISTA, explain the exact blocker and leave UI implementation pending.
Do not configure a global MCP server on another machine without a request; the CLI is an equally
valid route, and any agent can read this workflow.

## Design-to-code handoff

1. Capture the current rendered route and inspect adjacent screens, live tokens, components,
   `frontend/DESIGN.md`, and `skills/hu-workflow/references/design-system.md`.
2. Update the affected pen frames, preserving identity, spacing, typography, color semantics,
   and unrelated designs. Cover relevant desktop/mobile layouts, focus/disabled feedback, and
   loading/empty/error states. Use existing frames for refinements; new HU screens follow the
   `HU-XX · <Pantalla>` naming convention. Avoid generic style presets that replace the system.
3. Inspect the updated pen design before implementing it. Record affected frames and rationale
   in the HU spec or task report. Save the design in `dev-workflow`; implement in `frontend`.
4. Use `visual-qa` to compare the rendered result with the pen target and previous screenshots.
   Treat screenshots as evidence, not as replacement design files. Changes found during QA go
   through pen before further UI edits. Review baseline updates explicitly.

Check each repository's diff separately. Follow the HU workflow's existing human approval rules
for publishing changes; merely making a local design edit does not authorize a push or PR.
