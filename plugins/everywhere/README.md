# Workday Everywhere — Claude Code plugin

Connects Claude to the Workday Agent Gateway as an HTTP MCP server. The gateway supplies every tool
at runtime; this plugin ships no skills, commands, or agents of its own.

## Install

```
/plugin marketplace add Workday/everywhere
/plugin install everywhere@workday
```

## Configure

Enabling the plugin prompts for three values. None has a default — every deployment-specific value
comes from you, and nothing about your gateway is stored in this repository.

| Option                     | Sent as                        | Example                                                |
| -------------------------- | ------------------------------ | ------------------------------------------------------ |
| Agent Gateway MCP URL      | the server URL                 | `https://<region>.agent.workday.com/<your-tenant>/mcp` |
| Workday tenant             | `WD-Tenant` header             | `your-tenant-here`                                     |
| Workday agent tenant alias | `WD-Agent-Tenant-Alias` header | `your-alias-here`                                      |

The plugin also sends a fixed `wd-agent-interaction-channel` header, which the gateway uses to
decide response formatting.

## Connect

Run `/mcp`, pick `workday`, and complete sign-in in the browser. From a shell, the equivalent is
`claude mcp login workday`.

Sign-in needs no client ID or secret. Claude Code discovers the authorization server from the
gateway and registers a client automatically, then stores the token in your OS keychain.

## Use

Ask Claude a Workday question. It lists the gateway's tools and calls the right one. Tool names
carry a deployment-specific prefix, so they will not look identical across tenants.

## Troubleshooting

| Symptom                                        | Fix                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| No tools, or `401 Unauthorized`                | `/mcp` → sign in to `workday`                                      |
| Wrong tenant's data                            | Reconfigure the plugin options, then sign in again                 |
| Duplicate Workday tools                        | Another Workday plugin is enabled alongside this one — disable one |
| `does not support dynamic client registration` | See below                                                          |

If your gateway rejects dynamic client registration, it needs a pre-registered OAuth client, which a
plugin manifest cannot supply. Add the server manually instead:

```sh
claude mcp add --transport http \
  --client-id <your-client-id> --client-secret --callback-port 8765 \
  workday <your-gateway-mcp-url>
```

Register `http://localhost:8765/callback` as a redirect URI on that client first. The secret is
prompted for and stored in your keychain, never in a file.

## Package for Cowork

```sh
just bundle-plugin
```

Writes `dist/everywhere-plugin-<version>.zip` for Cowork's "Upload Plugin" flow. Bump `version` in
`.claude-plugin/plugin.json` before re-uploading — Cowork caches by version.
