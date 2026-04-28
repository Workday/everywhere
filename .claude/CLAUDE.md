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
