# Sana from Workday — Claude Code plugin

Connects Claude to Sana from Workday, powered by Sana — Workday's trusted AI. The plugin uses the
Workday Agent Gateway as an HTTP MCP server. The gateway supplies every tool at runtime, while the
bundled skills teach Claude how to discover and route those tools safely.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install sana@workday
```

## Configure

The connector needs three values specific to your Workday tenant, all from your Workday
administrator:

- the tenant's **MCP URL**, the endpoint Claude connects to
- an **OAuth client ID**
- that client's **OAuth client secret**

The gateway does not support automatic client registration, so the client has to be set up in
Workday ahead of time and its values entered by hand. None of them is committed here: the connector
in `.mcp.json` ships with an empty `url` and no OAuth client.

Register a redirect URI on the OAuth client for each Claude surface you use:

| Surface                     | Redirect URI                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Claude web, Desktop, Cowork | `https://claude.ai/api/mcp/auth_callback` and `https://claude.com/api/mcp/auth_callback` |
| Claude Code                 | `http://localhost:8765/callback`                                                         |

Claude currently signs in through the `claude.ai` callback. Anthropic recommends also allowing the
`claude.com` form, which it may move to. Claude Code's port is arbitrary, but it must match
`--callback-port` below.

Until Workday's connector listing is available in Claude, set the connector up one of these ways:

- **Claude on the web, Desktop, or Cowork:** an organization Owner opens **Organization settings →
  Connectors → Add → Custom**, enters the tenant's MCP URL, and sets the OAuth client ID and secret
  under **Advanced settings**. Members then connect from **Customize → Connectors**.
- **Claude Code:** add the server:

  ```sh
  claude mcp add --transport http \
    --client-id <your-client-id> --client-secret --callback-port 8765 \
    workday <your-tenant-mcp-url>
  ```

  The secret is prompted for and stored in your keychain, never in a file. The server you add
  appears in `/mcp` as `workday`. The plugin's own entry, which has the empty URL, appears there
  with a plugin label.

The empty `url` is there for Workday's connector listing: once the listing is live, an Owner can set
the connector up from it with **Add for your team**.

## Connect

Run `/mcp`, pick `workday`, and complete sign-in in the browser. From a shell, the equivalent is
`claude mcp login workday`. Claude Code stores the token in your OS keychain.

When the Workday tools appear, Claude says it is connected. That sentence does not call Workday.

## Use

Ask Claude a Workday question. The `workday` skill tells it to inspect the gateway's routing
resources, list the available tools, and call the exact tool the tenant provides. Tool names carry a
deployment-specific prefix, so they will not look identical across tenants. `agent_id` comes from
that live routing skill.

`/workday-onboard` asks Workday's agent, through live gateway routing, for the signed-in worker's
name, job title, and work location, then builds one card. Running it again refreshes that card. It
does not run on connect, and a normal Workday question does not build it. `using-workday-design` is
the card look.

## Troubleshooting

| Symptom                                             | Fix                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| No tools, or `401 Unauthorized`                     | `/mcp` → sign in to `workday`                                            |
| Duplicate Workday tools                             | Another Workday plugin is enabled alongside this one — disable one       |
| `Automatic client registration isn't supported`     | The connector has no OAuth client ID — see [Configure](#configure)       |
| Redirect URI mismatch at sign-in                    | Register that surface's redirect URI — see [Configure](#configure)       |
| **Add for your team** opens the connector directory | Workday's connector listing isn't live yet — see [Configure](#configure) |

## Package for Cowork

```sh
just bundle-plugin
```

Writes `dist/sana-plugin-<version>.zip` for Cowork's "Upload Plugin" flow. Bump `version` in
`.claude-plugin/plugin.json` before re-uploading — Cowork caches by version.
