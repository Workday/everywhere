# Workday Everywhere — Claude Code plugin marketplace

This repository hosts the `workday` Claude Code plugin marketplace and the plugins it advertises.

Today that is one plugin, **Workday Everywhere**, which connects Claude to the Workday Agent Gateway
over HTTP MCP. The gateway supplies every tool at runtime, so the plugin ships no skills, commands,
or agents of its own.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install everywhere@workday
```

Enabling the plugin prompts for your gateway's MCP endpoint — there is no default, and nothing about
your gateway is stored in this repository. Then run `/mcp`, pick `workday`, and sign in.

Full configuration, connection, and troubleshooting docs live in
[`plugins/everywhere/README.md`](plugins/everywhere/README.md).

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

| Path                   | Contents                                           |
| ---------------------- | -------------------------------------------------- |
| `.claude-plugin/`      | Marketplace manifest listing the published plugins |
| `plugins/everywhere/`  | The Workday Everywhere connector plugin            |
| `tests/claude-plugin/` | Manifest validation tests                          |
| `docs/superpowers/`    | Design specs and implementation plans              |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short:

```sh
just setup   # install dependencies
just check   # format check and typecheck
just test    # validate the manifests
```

## License

[Apache-2.0](LICENSE)
