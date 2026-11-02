# Sana from Workday — Microsoft 365 Copilot package

Sideload package for Microsoft 365 Copilot. It points Copilot at the Workday Agent Gateway over
remote MCP and bundles the same Workday skills as the Claude plugin.

The committed manifest uses placeholders. Put the tenant gateway URL and the OAuth vault reference
in a **local** copy before you zip and upload. Do not commit a tenant path, vault reference, client
secret, or access token.

```json
"mcpServerUrl": "https://your-tenant-here.example/mcp",
"referenceId": "replace-me"
```

`mcpServerUrl` is the tenant MCP endpoint your organization Owner registered. `referenceId` is the
Copilot OAuth plugin vault id for that registration (Teams Developer Portal), not a client secret.

## Zip for upload

```sh
just bundle-copilot
```

That writes `dist/sana-copilot-<version>.zip` (gitignored). Upload the zip in the Teams Developer
Portal or the Microsoft 365 admin center, then open **Sana Connector** in Copilot.

Smoke checks for a sideloaded app live in [`evals/`](evals/README.md). Eval result dumps stay local.
