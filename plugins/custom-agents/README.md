# Workday Custom Agents — Claude Code plugin

Connects Claude to Workday Custom Agents, powered by Agent Ready Tools. The plugin uses the Workday
Agent Gateway as an HTTP MCP server; the gateway supplies every tool at runtime, and this plugin
ships no skills, commands, or agents of its own.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install custom-agents@workday
```

## Configure

The Agent Gateway URL is specific to each Workday tenant, so the connector in `.mcp.json` ships with
an empty `url`. An organization Owner sets it once for the team: **Add for your team** on the
plugin's connector opens Workday's connector listing in Claude, where the Owner enters the tenant's
Agent Gateway URL. Members then sign in with their own Workday account. The connector sends no
custom headers.

This needs Workday's connector listing to be live. Until then, add the server by hand with your
tenant's Agent Gateway URL:

```sh
claude mcp add --transport http workday <your-tenant-gateway-url>
```

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
  workday <your-tenant-gateway-url>
```

The secret is prompted for and stored in your keychain, never in a file.

## Package for Cowork

```sh
just bundle-plugin custom-agents
```

Writes `dist/custom-agents-plugin-<version>.zip` for Cowork's "Upload Plugin" flow. Bump `version`
in `.claude-plugin/plugin.json` before re-uploading — Cowork caches by version.
