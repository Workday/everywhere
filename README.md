# Workday Everywhere — Claude Code plugin marketplace

This repository hosts the `workday` Claude Code plugin marketplace and the plugins it advertises.

| Plugin                    | Install                 | Powered by                 |
| ------------------------- | ----------------------- | -------------------------- |
| **Workday Custom Agents** | `custom-agents@workday` | Agent Ready Tools          |
| **Sana from Workday**     | `sana@workday`          | Sana, Workday's trusted AI |

Both plugins share one connector to the Workday Agent Gateway over HTTP MCP. The gateway supplies
every tool at runtime, so neither plugin ships skills, commands, or agents of its own. Install one
or the other — enabling both gives you duplicate tools.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install custom-agents@workday   # or: sana@workday
```

The connector needs your Workday tenant's Agent Gateway URL and an OAuth client ID, entered by an
organization Owner (or, in Claude Code, by each user) — the gateway does not support automatic
client registration. Each plugin's README walks through the setup. Members then run `/mcp`, pick
`workday`, and sign in with their own Workday account.

Full configuration, connection, and troubleshooting docs live in each plugin's README:
[`plugins/custom-agents/`](plugins/custom-agents/README.md) and
[`plugins/sana/`](plugins/sana/README.md).

### Migrating from `everywhere`

The `everywhere` plugin is now **Workday Custom Agents**. On Claude Code v2.1.193 or later, the
marketplace carries your `everywhere@workday` install and its settings over to
`custom-agents@workday`. Claude Code then needs the new plugin fetched once:

```text
/plugin marketplace update workday
/plugin install custom-agents@workday
```

To use Sana from Workday instead, install `sana@workday` and uninstall `custom-agents@workday`. On
older Claude Code versions, uninstall `everywhere@workday` and install one of the plugins above.

## Looking for the SDK?

The `@workday/everywhere` SDK and its `everywhere` CLI — for building Workday Everywhere plugins
that run inside Workday — no longer live on `main`. They moved, with their full history, to the
[`sdk`](https://github.com/Workday/everywhere/tree/sdk) branch:

```sh
git switch sdk
```

The published package on npm is unchanged; releases from that branch are currently paused.

> **Naming note:** "plugin" means two different things across these branches. On `main` it is a
> _Claude Code plugin_. On `sdk` it is a _Workday Everywhere plugin_ — a React app that runs inside
> Workday. They are unrelated formats.

## Repository layout

| Path                     | Contents                                           |
| ------------------------ | -------------------------------------------------- |
| `.claude-plugin/`        | Marketplace manifest listing the published plugins |
| `plugins/custom-agents/` | The Workday Custom Agents plugin                   |
| `plugins/sana/`          | The Sana from Workday plugin                       |
| `tests/claude-plugin/`   | Manifest validation tests                          |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

```sh
just setup   # install dependencies
just check   # format check and typecheck
just test    # validate the manifests
```

## License

[Apache-2.0](LICENSE)
