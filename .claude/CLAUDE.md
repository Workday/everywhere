# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

The Workday Everywhere SDK provides the core libraries and framework for building Workday Everywhere
(WE) platform integrations. This is a **public** repository — all changes must be made carefully to
avoid breaking downstream users.

## Public API Stability

This SDK is consumed by external users. Treat every exported symbol as a public contract:

- **No breaking changes** to public APIs without a deprecation path.
- Additions are safe; removals and signature changes require careful migration support.
- Review all changes for backwards compatibility before committing.

## Toolchain

- **Package manager:** npm
- **Type checking:** `npx tsc --noEmit`
- **Linter:** [ESLint](https://eslint.org/) with typescript-eslint (strict config)
- **Formatter:** [Prettier](https://prettier.io/) — see `.prettierrc.json` for settings
- **Task runner:** [just](https://github.com/casey/just) — see `.justfile` for available targets

### Common Commands

- `just setup` — install dependencies
- `just check` — typecheck + lint
- `just test` — run tests
- `just tidy` — format source files

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

Scope is optional but encouraged (e.g. `fix(auth): ...`, `feat(events): ...`).

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

## Import Conventions

All imports must use `.js` file extensions (the standard for npm packages that emit JS):

```typescript
import { Something } from './module.js'; // Correct
import { Something } from './module.ts'; // Incorrect
import { Something } from './module'; // Incorrect
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
   placeholders where examples need a URL.
3. **Non-public dependencies** — Do not add packages or registry configuration meant for private
   registry flows. This package is public (`@workday/everywhere` on public npm); new deps must be
   **publicly resolvable** the same way existing ones are. Be alert to **dependency confusion**: do
   not transcribe non-public package names from other repos without verifying they are legitimate
   public packages.
4. **Sensitive narrative in commits and comments** — Avoid embedding confidential details, private
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

- Do not introduce new **outbound network calls** from SDK or CLI runtime code (telemetry, version
  checks, analytics, crash reporting) without maintainer sign-off. Surprise network traffic is a
  privacy and supply-chain concern for downstream consumers.

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
  project is, how to try it quickly, and where to read more (`CONTRIBUTING.md` for dev setup
  including `just test`, etc.).
- When workflow commands change, **update the docs you touch** so a newcomer is not misled.

### Tests

- The project expects **automated tests**; agents follow the TDD protocol above.
- **Describe how to run tests** in README or CONTRIBUTING (this repo documents commands in
  CONTRIBUTING—keep that section current).

### Generated API / reference docs

- Use **TypeScript-appropriate** doc generators when maintainers add them.
- Keep doc generation **documented and repeatable** if outputs are checked in.

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

- **CI** should run tests automatically (e.g. GitHub Actions); if README has CI badges, they should
  match **real** status.
- **Publishing** for this ecosystem is **public npm**; mirroring into private registries or
  switching private consumers to OSS artifacts is **post-release organizational work** (artifact
  review and private distribution)—not something to encode in application source without maintainer
  request.

### Naming and trademarks

- **Renames, logos, and public branding** need **Legal / trademark** clearance—agents do not rename
  the product or add unofficial logos.

### Team review

- Non-trivial releases benefit from **peer review** before merging to the default branch; agents do
  not replace that process.
