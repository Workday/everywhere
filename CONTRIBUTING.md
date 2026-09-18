# Contributing to the Workday plugin marketplace

Thank you for your interest in contributing! At this time, **we are not accepting pull requests from
external forks.** Contributions are limited to Workday employees and authorized collaborators with
direct access to this repository.

If you've found a bug or have a feature request, please
[open an issue](https://github.com/Workday/everywhere/issues).

> Changes to the `@workday/everywhere` SDK and CLI belong on the
> [`sdk`](https://github.com/Workday/everywhere/tree/sdk) branch, which carries its own toolchain
> and its own copy of this guide.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [just](https://github.com/casey/just) command runner
- [jq](https://jqlang.github.io/jq/) — only for `just bundle-plugin`

### Getting Started

```sh
git clone git@github.com:Workday/everywhere.git
cd everywhere
just setup
```

### Development Workflow

| Command              | Description                                   |
| -------------------- | --------------------------------------------- |
| `just setup`         | Install dependencies                          |
| `just check`         | Format check and typecheck                    |
| `just test`          | Validate the plugin and marketplace manifests |
| `just tidy`          | Format source files                           |
| `just bundle-plugin` | Zip the plugin for Cowork's upload flow       |

This branch holds no application code — the plugin is JSON manifests and documentation. `just test`
runs the manifest tests in `tests/claude-plugin/`, which assert the plugin and marketplace manifests
stay consistent with each other and leak no gateway hostnames.

### Testing a plugin change locally

Point a local marketplace at your checkout, then install from it:

```text
/plugin marketplace add /path/to/everywhere
/plugin install everywhere@workday
```

### Releasing a plugin change

Bump `version` in `plugins/everywhere/.claude-plugin/plugin.json` — Claude Code and Cowork both
cache by version, so an unchanged version will not be picked up.

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
`describe`/`it` blocks with one expectation per test case. See [CLAUDE.md](.claude/CLAUDE.md) for
the full protocol.
