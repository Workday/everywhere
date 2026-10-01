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

| Command                       | Description                             |
| ----------------------------- | --------------------------------------- |
| `just setup`                  | Install dependencies                    |
| `just check`                  | Format check and typecheck              |
| `just test`                   | Check the connector policy rules        |
| `just tidy`                   | Format source files                     |
| `just bundle-plugin <plugin>` | Zip one plugin for Cowork's upload flow |

This branch holds no application code — the plugins are JSON manifests and documentation. Schema
validity is checked when a plugin is submitted, so `just test` covers only the policy rules a schema
check cannot see. Both plugins must connect to the shared gateway endpoint over HTTP, declare no
`userConfig`, and commit no local command, custom headers, or OAuth client material. The two
plugins' `.mcp.json` files must also stay identical.

### Testing a plugin change locally

Point a local marketplace at your checkout, then install from it:

```text
/plugin marketplace add /path/to/everywhere
/plugin install custom-agents@workday   # or: sana@workday
```

### Releasing a plugin change

Bump `version` in `plugins/<plugin>/.claude-plugin/plugin.json` for each plugin you changed — Claude
Code and Cowork both cache by version, so an unchanged version will not be picked up.

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
