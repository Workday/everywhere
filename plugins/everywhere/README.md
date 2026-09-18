# Workday Everywhere — Claude Code plugin

Connects Claude to the Workday Agent Gateway as an HTTP MCP server. The gateway supplies every tool
at runtime; this plugin ships no skills, commands, or agents of its own.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install everywhere@workday
```

## Configure

Nothing to configure. The plugin connects to the shared Agent Gateway endpoint
(`https://sana.we.myworkday.com/mcp`); sign-in determines your tenant. The connector sends no custom
headers.

## Connect

Run `/mcp`, pick `workday`, and complete sign-in in the browser. From a shell, the equivalent is
`claude mcp login workday`.

Sign-in normally needs no client ID or secret: Claude Code discovers the gateway's authorization
server, registers a client automatically, and stores the token in your OS keychain. If the gateway
does not support dynamic client registration, this step fails — see
[Troubleshooting](#troubleshooting) for the manual fallback.

## Use

Ask Claude a Workday question. It lists the gateway's tools and calls the right one. Tool names
carry a deployment-specific prefix, so they will not look identical across tenants.

## Troubleshooting

| Symptom                                        | Fix                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| No tools, or `401 Unauthorized`                | `/mcp` → sign in to `workday`                                      |
| Duplicate Workday tools                        | Another Workday plugin is enabled alongside this one — disable one |
| `does not support dynamic client registration` | See below                                                          |

If the gateway rejects dynamic client registration, it needs a pre-registered OAuth client, which a
plugin manifest cannot supply. Register `http://localhost:8765/callback` as a redirect URI on that
OAuth client, then add the server manually:

```sh
claude mcp add --transport http \
  --client-id <your-client-id> --client-secret --callback-port 8765 \
  workday https://sana.we.myworkday.com/mcp
```

The secret is prompted for and stored in your keychain, never in a file.

## Package for Cowork

```sh
just bundle-plugin
```

Writes `dist/everywhere-plugin-<version>.zip` for Cowork's "Upload Plugin" flow. Bump `version` in
`.claude-plugin/plugin.json` before re-uploading — Cowork caches by version.
