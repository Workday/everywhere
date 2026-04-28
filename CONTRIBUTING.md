# Contributing to the Workday Everywhere SDK

Thank you for your interest in contributing! At this time, **we are not accepting pull requests from
external forks.** Contributions are limited to Workday employees and authorized collaborators with
direct access to this repository.

If you've found a bug or have a feature request, please
[open an issue](https://github.com/Workday/everywhere/issues).

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [just](https://github.com/casey/just) command runner

### Getting Started

```sh
git clone git@github.com:Workday/everywhere.git
cd everywhere/sdk
just setup
```

### Development Workflow

| Command      | Description          |
| ------------ | -------------------- |
| `just setup` | Install dependencies |
| `just check` | Typecheck and lint   |
| `just test`  | Run tests            |
| `just tidy`  | Format source files  |
| `just build` | Build to dist/       |

> **Note:** Run `just build` before using the `everywhere` CLI locally. The CLI commands are
> compiled from TypeScript and won't be available until the build output exists.

### Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

### Branch Naming

```
<type>/<change-slug>
```

Examples: `feat/email-notifications`, `fix/sidebar-delete-width`, `chore/update-deps`

### Test-Driven Development

We follow TDD for all implementation work. Tests are written first in a behavior-driven style using
`describe`/`it` blocks with one expectation per test case. See [CLAUDE.md](.claude/CLAUDE.md) for the full
TDD protocol.
