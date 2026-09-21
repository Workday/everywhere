# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This branch hosts the `workday` **Claude Code plugin marketplace** and the plugins it advertises.
Today that is one plugin, **Workday Everywhere**, which connects Claude to the Workday Agent Gateway
over HTTP MCP. The gateway supplies every tool at runtime; the plugin ships no skills, commands, or
agents.

This is a **public** repository — all changes must be made carefully to avoid breaking downstream
users.

There is no application code here. The plugin is JSON manifests plus documentation; the only
TypeScript is the manifest test suite.

### Where the SDK went

The `@workday/everywhere` SDK and its `everywhere` CLI live on the **`sdk` branch**, with their full
history. `main` and `sdk` have permanently diverged — they share files by name only, and merging one
into the other is never the right move. If a request concerns the SDK, the CLI, `src/`, `cli/`, or
`examples/`, that work belongs on `sdk`, not here. SDK releases to npm are currently paused.

"Plugin" means two different things across these branches. Here it is a _Claude Code plugin_. On
`sdk` it is a _Workday Everywhere plugin_ — a React app that runs inside Workday. Do not conflate
them.

## Manifest stability

The plugin manifest is a public contract for everyone who has already installed the plugin:

- Renaming the plugin, the marketplace, or the MCP server breaks existing installs.
- Removing or renaming a `userConfig` key silently drops that user's configured value.
- Adding a new **required** `userConfig` key breaks existing installs; prefer optional keys.
- Bump `version` in `plugins/everywhere/.claude-plugin/plugin.json` for any user-visible change —
  Claude Code and Cowork both cache by version.

## Repository layout

| Path                   | Contents                                           |
| ---------------------- | -------------------------------------------------- |
| `.claude-plugin/`      | Marketplace manifest listing the published plugins |
| `plugins/everywhere/`  | The Workday Everywhere connector plugin            |
| `tests/claude-plugin/` | Manifest validation tests                          |
| `docs/superpowers/`    | Design specs and implementation plans              |

## Toolchain

- **Package manager:** npm
- **Type checking:** `npx tsc --noEmit` (covers `tests/` only)
- **Formatter:** [Prettier](https://prettier.io/) — see `.prettierrc.json` for settings
- **Task runner:** [just](https://github.com/casey/just) — see `.justfile` for available targets

There is no ESLint and no build step on this branch; both live on `sdk`.

### Common Commands

- `just setup` — install dependencies
- `just check` — format check + typecheck
- `just test` — run the manifest tests
- `just tidy` — format source files
- `just bundle-plugin` — zip the plugin for Cowork's "Upload Plugin" flow (needs `jq`)

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

Scope is optional but encouraged (e.g. `fix(plugin): ...`, `docs(marketplace): ...`).

## Jira ticket hygiene

When creating or updating Jira tickets for this team, always verify these routing fields so work
appears on the correct board/backlog:

- **Project**: set to the correct Jira project key (for this team, typically `NW`).
- **Team**: set the Jira Team field (`customfield_13400`) to the exact board-mapped team value (for
  this team, `WE Plugins`).
- **Scrum Team**: if used by a board/workflow, set Jira Scrum Team (`scrumTeam`) to the exact valid
  option.
- **Component**: set `components` to the expected component (for this team, `WE PlugIns`).

Do not assume team values from board names; use the exact dropdown option value accepted by Jira.

## Branch Naming

Use the same type prefixes as commits, followed by a short description of the intended changes:

```
<type>/<change-slug>
```

Examples: `feat/email-notifications`, `fix/sidebar-delete-width`, `chore/update-deps`

Optionally include the issue number: `feat/279-email-notifications`

## Worktrees

Use a dedicated git worktree for development to keep the main working directory clean. Worktrees
live in the `.worktrees/` directory and are specific to an agent session (not the feature or
changes). Each session should use a fresh worktree with a unique name. Always announce your worktree
name when creating or switching to a new worktree - feel free to be creative/silly with the name
selection.

```bash
# Create a worktree based on origin/main
git worktree add .worktrees/<name> -b <branch-name> origin/main

# Clean up after merging
git worktree remove .worktrees/<name>
```

## Test-Driven Development

We follow **test-driven development (TDD)** for all implementation work:

1. **Test first.** A failing test must be written before any implementation code may be changed. Do
   not modify production code to add behavior until a test exists that fails for the right reason.

2. **Minimal implementation.** Only the simplest implementation required to make the test pass is
   allowed. Avoid adding generality or "nice to have" behavior that the current test does not
   demand.

3. **Red-green-refactor.** Work in cycles: write a failing test (red), add the smallest change to
   make it pass (green), then refactor for clarity and design while keeping tests green. Do not skip
   the red or green steps.

4. **Behavior-driven style.** Tests are written in a behavior-driven style using `describe` and
   `it`. Describe behavior and scenarios in plain language; test names should read as
   specifications.

5. **One expectation per test case.** Each test case may make **only one expectation or assertion**.
   If you need to verify multiple aspects of the result, use multiple test cases — each with a
   single expectation — so that a failure points to one specific behavior.

6. **One describe per branch.** When a code path branches on a condition, each branch is captured in
   its own `describe` block. Nest `describe` blocks to reflect the structure of the behavior.

On this branch the rule applies to manifest changes too: assert the new invariant in
`tests/claude-plugin/manifest.test.ts` before editing the JSON.

## Agent alignment (Cursor + Claude)

Cursor loads `.cursor/rules/conventions.mdc`, `security.mdc`, and `oss.mdc` (always on), plus
`tdd.mdc` for TypeScript edits. This file carries the matching Claude Code narrative below.

---

## Security (public OSS)

The following applies to **agent-assisted changes** on this **public** OSS repo so we avoid
accidental violations of common open-source security practice (aligned with OpenSSF-style concerns:
secrets, supply chain, and disclosure).

### Intent

- **Security through obscurity is not the goal**, but the repo must not leak confidential data or
  routes to attack surfaces (dependency confusion, leaked credentials, or non-public tooling).
- Rules here are **guardrails**, not an exhaustive security review checklist.

### What must never enter the codebase or published git metadata

1. **Secrets** — No credentials, API keys, tokens, private keys, or live connection strings in
   source, tests, examples, or committed config. Use env vars and **obviously placeholder** values
   (`example-token`, `your-tenant-here`) in documentation, examples, and fixtures—never
   realistic-looking strings.
2. **Private systems and domains** — Avoid real hostnames or URLs for private infrastructure
   (including private corporate domains and private Git/CI/artifact/wiki portals). Use fictional
   placeholders where examples need a URL. **This is the sharpest risk on this branch:** no real
   gateway hostname or tenant may appear in `.mcp.json`, `plugin.json`, or the READMEs. The gateway
   URL comes from the user at install time and nowhere else, and the manifest tests enforce it.
3. **No committed OAuth client material** — `.mcp.json` must carry no `oauth` block, no client ID,
   and no headers. Claude Code registers a client dynamically at sign-in.
4. **Non-public dependencies** — Do not add packages or registry configuration meant for private
   registry flows; new deps must be **publicly resolvable** on public npm. Be alert to **dependency
   confusion**: do not transcribe non-public package names from other repos without verifying they
   are legitimate public packages.
5. **Sensitive narrative in commits and comments** — Avoid embedding confidential details, private
   links, or authentication artifacts in commit messages, PR text, or comments that sync to the
   public repository.

### Dependencies and maintenance

- When you touch **`package.json`** or lockfiles, keep choices consistent with **public npm** and
  routine dependency hygiene (prefer current, supported versions consistent with project
  constraints).
- **Verify new dependencies on `npmjs.com`** (publisher, age, weekly downloads, working repo link)
  before adding.
- Do not add **lifecycle scripts** (`preinstall`, `install`, `postinstall`, `prepare`) that fetch
  from non-public infrastructure or run untrusted code at install time. Existing lifecycle scripts
  (e.g. `prepare: husky`) should not be expanded without maintainer review.

### Workflows and CI

- **Pin third-party GitHub Actions to commit SHAs**, not floating tags (e.g.
  `actions/checkout@<sha>`, not `@v4`).
- Keep workflow `permissions:` **least-privilege**; default to read-only and grant per-job only what
  is needed.
- Do not add `pull_request_target` triggers without explicit maintainer review—they run with write
  access to the base repo.
- Never echo `${{ secrets.* }}` to logs; reference secrets only in the steps that need them.

### Outbound network calls

- The plugin's only outbound traffic is the MCP connection to the user's own gateway. Do not add
  telemetry, version checks, analytics, or crash reporting, and do not add a second MCP server or
  any local `command` server without maintainer sign-off.

### Logging hygiene

- Do not log credentials, auth tokens, cookies, full request/response bodies, or full request
  headers. Redact at the boundary.

### Vulnerability disclosure

- The repo currently has **no `SECURITY.md`**. Do not add one or invent a security contact path; if
  you believe one is needed, raise it with maintainers.
- If a `SECURITY.md` or GitHub Security policy is published later, defer to it. Do not guess email
  aliases or private queues.

### Review and automation

- Agents must not bypass required review or approval gates before merge.
- Security scanning tools (e.g. secret scanning, SAST) may run in CI—write code that passes
  reasonable static checks (no secrets in tree).

### Scorecard and maturity

- A healthy public repo aligns with **OpenSSF Scorecard**-style practices over time (branch
  protection, dependency updates, security policy). Agent changes should **not regress** obvious
  hygiene (e.g. committing secrets, weakening dependency sources).

When in doubt, **omit non-public specifics** and **use public-safe placeholders**.

---

## Public OSS quality and onboarding

These expectations align with common **public release** hygiene (good first impression, reproducible
builds, clear legal posture).

### README and documentation

- The **README** should stay **interesting, accurate, and sufficient for onboarding**: what the
  project is, how to install the plugin quickly, and where to read more
  (`plugins/everywhere/README.md` for configuration, `CONTRIBUTING.md` for dev setup).
- The README must keep pointing at the `sdk` branch. Visitors arriving for `@workday/everywhere`
  land on `main` first, and a missing pointer reads as a deleted project.
- When workflow commands change, **update the docs you touch** so a newcomer is not misled.

### Tests

- The project expects **automated tests**; agents follow the TDD protocol above.
- **Describe how to run tests** in README or CONTRIBUTING (this repo documents commands in
  CONTRIBUTING—keep that section current).

### Code cleanliness

- **Delete old commented-out code** rather than leaving large disabled blocks.
- Avoid committing **debug leftovers** or scratch paths.

### LICENSE and CONTRIBUTING

- **`LICENSE`** and **`CONTRIBUTING.md`** reflect maintainer-approved repository policy—agents must
  not rewrite them casually or substitute another license.
- External contribution policy text is **maintainer-owned**. This repo currently **does not accept
  external pull requests** (see `CONTRIBUTING.md`)—do not add CLA, DCO, or external-contribution
  scaffolding without maintainer direction.

### Per-file headers

- If maintainers adopt **copyright/license headers**, match the **same license as `LICENSE`** and
  team conventions; do not copy boilerplate from unrelated projects (wrong license or year).

### Contributors

- Attribution files (**CONTRIBUTORS**, etc.) are optional but **preserve existing entries**; add
  names only when directed.

### Release and publishing (context)

- Nothing on this branch publishes to npm. The plugin is distributed by the marketplace manifest on
  the default branch, and by `just bundle-plugin` for Cowork uploads. Do not add npm publish
  workflows here — that machinery lives on `sdk`.

### Naming and trademarks

- **Renames, logos, and public branding** need **Legal / trademark** clearance—agents do not rename
  the product or add unofficial logos.

### Team review

- Non-trivial releases benefit from **peer review** before merging to the default branch; agents do
  not replace that process.
