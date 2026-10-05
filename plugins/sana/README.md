# Sana from Workday — Claude Code plugin

Connects Claude to Sana from Workday, powered by Sana — Workday's trusted AI. The plugin uses the
Workday Agent Gateway as an HTTP MCP server; the gateway supplies every tool at runtime, and this
plugin ships no skills, commands, or agents of its own.

## Install

```text
/plugin marketplace add Workday/everywhere
/plugin install sana@workday
```

## Configure

The connector needs two values specific to your Workday tenant: its Agent Gateway URL and an OAuth
client ID. The gateway does not support automatic client registration, so the client ID always has
to be entered by hand. Neither value is committed here: the connector in `.mcp.json` ships with an
empty `url` and no OAuth client.

Until Workday's connector listing is available in Claude, set the connector up one of these ways:

- **Claude on the web, Desktop, or Cowork:** an organization Owner opens **Organization settings →
  Connectors → Add → Custom**, enters the tenant's Agent Gateway URL, and sets the OAuth client ID
  and secret under **Advanced settings**. Members then connect from **Customize → Connectors**.
- **Claude Code:** register `http://localhost:8765/callback` as a redirect URI on the OAuth client,
  then add the server:

  ```sh
  claude mcp add --transport http \
    --client-id <your-client-id> --client-secret --callback-port 8765 \
    workday <your-tenant-gateway-url>
  ```

  The secret is prompted for and stored in your keychain, never in a file.

The empty `url` is there for Workday's connector listing: once the listing is live, an Owner can set
the connector up from it with **Add for your team**.

## Connect

Run `/mcp`, pick `workday`, and complete sign-in in the browser. From a shell, the equivalent is
`claude mcp login workday`. Claude Code stores the token in your OS keychain.

## Use

Ask Claude a Workday question. It lists the gateway's tools and calls the right one. Tool names
carry a deployment-specific prefix, so they will not look identical across tenants.

## Troubleshooting

| Symptom                                             | Fix                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| No tools, or `401 Unauthorized`                     | `/mcp` → sign in to `workday`                                            |
| Duplicate Workday tools                             | Another Workday plugin is enabled alongside this one — disable one       |
| `Automatic client registration isn't supported`     | The connector has no OAuth client ID — see [Configure](#configure)       |
| **Add for your team** opens the connector directory | Workday's connector listing isn't live yet — see [Configure](#configure) |

## Package for Cowork

```sh
just bundle-plugin
```

Writes `dist/sana-plugin-<version>.zip` for Cowork's "Upload Plugin" flow. Bump `version` in
`.claude-plugin/plugin.json` before re-uploading — Cowork caches by version.
