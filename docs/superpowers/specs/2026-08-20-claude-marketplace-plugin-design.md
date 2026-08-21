# Claude Code marketplace plugin — Agent Gateway connector

**Status:** proposed · **Date:** 2026-08-20

## Purpose

Prove that this repository can carry a Claude Code plugin alongside the npm package, by shipping the
Workday Agent Gateway MCP connector as an installable plugin. This is a proof of concept for
repositioning the repository toward agent integrations. It is deliberately connector-only: no
skills, no commands, no agents, no hooks.

Success means a user can run two commands, supply a gateway URL, sign in through the browser, and
call gateway tools from Claude Code — with no credential, hostname, or tenant value committed to the
repository.

## Scope

Additive. `src/`, `cli/`, `bin/`, `tsconfig*.json`, and the `package.json` dependency and export
surface are untouched. The npm package is unaffected: `package.json` uses an explicit `files`
allowlist (`dist`, `bin`, `cli/dist`, `cli/package.json`, `cli/oclif.manifest.json`), so none of the
new files are published.

Out of scope: skills of any kind, a stdio connector variant, changes to the root `README.md`, and
any deprecation of the existing SDK surface.

## Background

Two earlier internal prototypes informed this design.

The first ships an HTTP MCP plugin pointing at the Agent Gateway with host OAuth, tenant headers
drawn from `userConfig`, and a fixed interaction-channel header. It also ships a stdio variant that
bundles a compiled connector owning OAuth itself. The stdio approach is not a candidate here — it
requires a build step and a binary that cannot be committed.

The second ships a marketplace named `workday` containing an `everywhere` plugin: a root marketplace
manifest, a plugin directory, an HTTP MCP server also named `workday`, and no OAuth block at all —
sign-in relies on discovery and dynamic client registration.

This design takes the marketplace shape and the credential-free sign-in from the second. It
originally took the tenant headers from the first as well; see [Amendments](#amendments) for why
those were later dropped, leaving a connector that is close to the second prototype's shape.

## Layout

```
.claude-plugin/marketplace.json          marketplace manifest, name "workday"
plugins/everywhere/
  .claude-plugin/plugin.json             name, version, userConfig
  .mcp.json                              the connector
  README.md                              install, configure, connect, troubleshoot
tests/claude-plugin/manifest.test.ts     manifest shape and safety assertions
.justfile                                gains one `bundle-plugin` recipe
```

The directory is `plugins/` rather than the deeply nested path an earlier prototype used, which
carried internal jargon with no meaning to a public reader.

Install is:

```
/plugin marketplace add Workday/everywhere
/plugin install everywhere@workday
```

## Components

### Marketplace manifest

`.claude-plugin/marketplace.json` declares a marketplace named `workday` owned by Workday, with a
single plugin entry whose `source` is `./plugins/everywhere`. The entry carries `displayName`,
`description`, `category: productivity`, keywords, and `license: Apache-2.0` — matching this
repository's actual license rather than the one an earlier prototype declared.

The `owner` block names Workday and links the repository. It carries no personal email address.

### Plugin manifest

`plugins/everywhere/.claude-plugin/plugin.json` declares `name: everywhere`, a `displayName` of
"Workday Everywhere", `version: 0.1.0`, author, homepage, repository, license, keywords, and one
`userConfig` field:

| Key           | Title                 | Required | Default | Used as          |
| ------------- | --------------------- | -------- | ------- | ---------------- |
| `gateway_url` | Agent Gateway MCP URL | yes      | none    | the server `url` |

The field declares no `default`. That is the mechanism by which the design avoids hard-coding a
gateway: every deployment-specific value is supplied by the installing user at enable time. The
`description` text carries an angle-bracketed example
(`https://<region>.agent.workday.com/<your-tenant>/mcp`) that is unmistakably a template.

The URL is tenant-scoped, so its path segment carries the tenant. See [Amendments](#amendments) for
why no separate tenant fields exist.

There is no `skills` key. The manifest declares no components other than the MCP server that
`.mcp.json` provides by convention. Claude Code treats an MCP-only plugin as valid; only `name` is
required when a manifest is present.

### Connector

`plugins/everywhere/.mcp.json`:

```json
{
  "mcpServers": {
    "workday": {
      "type": "http",
      "url": "${user_config.gateway_url}"
    }
  }
}
```

The server is named `workday`, matching both prior implementations. This is intentional: the three
plugins are mutually exclusive by construction, so a user cannot silently end up with two transports
to the same gateway.

The connector sends no custom headers. A URL and a transport are the whole configuration surface.

Tools are not declared anywhere. They are federated by the gateway and discovered at runtime after
sign-in, under a deployment-specific prefix.

### Authentication

The connector declares no `oauth` block. Sign-in uses Claude Code's default discovery chain — RFC
9728 protected resource metadata, then RFC 8414 authorization server metadata — followed by dynamic
client registration, or a Client ID Metadata Document where the server publishes one. Tokens are
stored in the OS keychain. Nothing authentication-related is committed.

This resolves a constraint discovered during design: `${user_config.*}` substitution in plugin MCP
configurations applies only to `env`, `url`, and `headers`. Plain environment variable expansion
(`${VAR}`, `${VAR:-default}`) applies only to `command`, `args`, `env`, `url`, and `headers`.
Neither applies inside `oauth`, so `oauth.clientId` can hold only a literal string. A templated
client ID is therefore not expressible, and any client ID in the manifest would be a committed
constant. Omitting the block is the only option that satisfies the repository's security rules.

A consequence worth recording: an existing connector configures `oauth.clientId` with an
environment-variable template, relying on expansion in a location the documentation does not list,
so that override may not behave as intended there.

Client secrets were never at risk. Claude Code accepts a secret only via the `--client-secret` flag
or `MCP_CLIENT_SECRET`, and stores it in the keychain; `.mcp.json` has no field for one.

If the gateway rejects dynamic client registration, the fallback is documented in the plugin README
rather than encoded in the manifest: the user adds the server manually with
`claude mcp add --transport http --client-id … --client-secret --callback-port …`. This is a
documentation change only and does not alter the design.

### Packaging

`.justfile` gains a `bundle-plugin` recipe that zips `plugins/everywhere/` into
`dist/everywhere-plugin-<version>.zip`, reading the version from the plugin manifest, for Claude
Cowork's "Upload Plugin" flow. `dist/` is already gitignored.

## Testing

The repository mandates test-driven development. The artifacts here are JSON, so the tests assert
manifest shape. Each assertion fails before its corresponding file exists, so the red-green cycle
holds normally.

`tests/claude-plugin/manifest.test.ts` reads the three JSON files from disk and asserts, one
expectation per test case, with a `describe` block per file:

**Marketplace manifest**

- declares the marketplace name `workday`
- declares exactly one plugin
- the plugin entry is named `everywhere`
- the entry's `source` resolves to an existing directory
- the entry's license matches the license declared by the plugin it advertises

**Plugin manifest**

- declares the plugin name `everywhere`
- declares `gateway_url` and no other `userConfig` key
- marks every `userConfig` field required
- declares no `default` on any `userConfig` field
- declares no `skills` key

**Connector**

- declares exactly one MCP server
- names that server `workday`
- declares the server as `type: http`
- declares no `command` key
- takes its URL from user configuration
- sends no custom headers
- declares no `oauth` key
- hard-codes nothing at all
- names no host anywhere in the file

The last three are the load-bearing ones. Together they mechanically enforce the two properties this
design is built around: no committed credential material, and no hard-coded gateway. They will fail
loudly if someone later reintroduces a convenience default.

The connector block resolves its server eagerly and throws if no `workday` server is declared,
rather than falling back to an empty object. A fallback would let the `oauth` and `command`
assertions pass without ever inspecting a real server — the failure mode these tests exist to catch.

"Hard-codes nothing at all" is an allow-list: every value in the connector must match
`${user_config.*}`, with no permitted literals. That catches any hard-coded hostname, tenant, or
token, not just a recognisable URL scheme. The host-name check is a cheap textual backstop alongside
it.

Tests live under `tests/claude-plugin/` rather than as a top-level `tests/plugin.test.ts`, which
already exists and covers the SDK's `plugin()` function.

## Verification

`just check` runs `prettier --check .`, which covers the new JSON and Markdown, so all new files
must be Prettier-formatted. `eslint` runs only against `src/` and `cli/src/` and `tsc --noEmit`
includes only `src`, so neither inspects these files. `just test` runs the new assertions through
Vitest, which picks them up by its default glob.

Manual acceptance, which the automated tests cannot cover, is recorded in the plugin README: add the
marketplace, install, supply the gateway URL, sign in via `/mcp`, and confirm gateway tools appear.

## Risks

**Dynamic client registration may not be supported.** One prior prototype states the gateway offers
none, which is why its stdio connector exists; the other states sign-in works this way today against
the same host family. These claims conflict and the POC will settle it. If DCR fails, the manual
`claude mcp add` fallback applies and the plugin's value is reduced to configuration convenience — a
documentation change, not a redesign.

**Dropping the tenant headers is not confirmed.** See [Amendments](#amendments) — the change was
made on a reviewer's recollection, not on a verified gateway contract.

**A public repository becoming a marketplace is externally visible.** Adding
`.claude-plugin/marketplace.json` at the root signals the repositioning before any decision about it
is final. The branch is not merged by this work.

## Open questions

None blocking. The DCR question above is what the POC is for.

## Amendments

**2026-08-21 — removed all custom headers and the two tenant fields.** As originally designed, the
connector sent `WD-Tenant`, `WD-Agent-Tenant-Alias`, and a fixed `wd-agent-interaction-channel`
header, the first two fed by their own required `userConfig` fields.

In review, a maintainer noted the gateway team had merged a change removing that requirement, so the
headers were dropped and the connector reduced to a transport and a URL. Tenant routing now rests
entirely on the tenant-scoped URL path — which is what one of the two prior prototypes has always
done, so the shape is not unprecedented.

Two consequences worth recording. The configuration surface fell from three prompts to one. And the
allow-list safety test got strictly stronger: with no fixed channel value to permit, it now requires
_every_ connector value to be a `${user_config.*}` template, with no literals allowed at all.

The caveat is that this rests on a recollection rather than a verified contract; the reviewer
suggested confirming with the gateway team. If the headers turn out to still be required, restoring
them means re-adding the two `userConfig` fields, the `headers` block, and the permitted-literal
exception in the allow-list test.
