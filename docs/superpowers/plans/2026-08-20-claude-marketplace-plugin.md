# Claude Marketplace Connector Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Workday Agent Gateway MCP connector as an installable Claude Code plugin,
distributed from a marketplace manifest at the root of this repository.

**Architecture:** Three JSON manifests and a README, entirely additive. A root
`.claude-plugin/marketplace.json` advertises one plugin living in `plugins/everywhere/`. That plugin
declares three required `userConfig` fields and a single HTTP MCP server whose URL and tenant
headers are templated from those fields. No `oauth` block, no skills, no defaults, no hard-coded
gateway. A Vitest suite asserts the manifest shapes and mechanically enforces the two safety
properties.

**Tech Stack:** JSON manifests (Claude Code plugin schema), Vitest, Prettier, `just`.

**Reference:** `docs/superpowers/specs/2026-08-20-claude-marketplace-plugin-design.md`

---

## Context an implementer needs

**This is a public repository.** The security rules in `.claude/CLAUDE.md` forbid committing
credentials, private hostnames, or realistic-looking secret values. Two tests in Task 2 exist
specifically to enforce that. Do not "helpfully" add a `default` gateway URL or an `oauth` block —
those tests will fail, and they are meant to.

**Tests read JSON from disk rather than importing it.** One assertion needs the raw file text (to
prove no hard-coded URL), so the suite reads and parses files itself. Keep that pattern.

**Formatting is enforced.** `just check` runs `npx prettier --check .`, which covers every new JSON
and Markdown file. Every task ends by running `npx prettier --write` on the files it touched before
committing. `eslint` runs only against `src/` and `cli/src/`, and `tsc --noEmit` includes only
`src`, so neither inspects these files.

**Task order matters.** The plugin directory must exist before the marketplace manifest can point at
it, so the plugin is built first (Tasks 1–2) and the marketplace last (Task 3).

**Run tests with the narrow command while iterating:** `npx vitest run tests/claude-plugin/`. The
full `just test` runs a build and an examples install first, and is only needed once, in Task 6.

## File structure

| File                                            | Responsibility                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tests/claude-plugin/manifest.test.ts`          | All manifest shape and safety assertions. Created in Task 1, appended to in Tasks 2–3. |
| `plugins/everywhere/.claude-plugin/plugin.json` | Plugin identity and the three user-supplied config fields.                             |
| `plugins/everywhere/.mcp.json`                  | The connector: one HTTP MCP server, templated URL and headers.                         |
| `plugins/everywhere/README.md`                  | Install, configure, connect, troubleshoot.                                             |
| `.claude-plugin/marketplace.json`               | Marketplace named `workday` advertising the one plugin.                                |
| `.justfile`                                     | Gains a `bundle-plugin` recipe for Cowork zip upload.                                  |

The test file is deliberately one file rather than three: the three manifests are a single contract,
they change together, and the suite is small.

---

### Task 1: Plugin manifest

**Files:**

- Create: `tests/claude-plugin/manifest.test.ts`
- Create: `plugins/everywhere/.claude-plugin/plugin.json`

- [ ] **Step 1: Write the failing test**

Create `tests/claude-plugin/manifest.test.ts` with exactly this content:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const readText = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

interface UserConfigField {
  type: string;
  title: string;
  description: string;
  required?: boolean;
  default?: unknown;
}

interface PluginManifest {
  name: string;
  version: string;
  license: string;
  skills?: unknown;
  userConfig: Record<string, UserConfigField>;
}

const pluginManifest = JSON.parse(
  readText('plugins/everywhere/.claude-plugin/plugin.json')
) as PluginManifest;

const userConfigEntries = Object.entries(pluginManifest.userConfig ?? {});

describe('the everywhere plugin manifest', () => {
  it('names the plugin "everywhere"', () => {
    expect(pluginManifest.name).toBe('everywhere');
  });

  it('declares the repository license', () => {
    expect(pluginManifest.license).toBe('Apache-2.0');
  });

  it('bundles no skills', () => {
    expect(pluginManifest.skills).toBeUndefined();
  });

  describe('user configuration', () => {
    it('declares a field for each value the connector needs', () => {
      expect(Object.keys(pluginManifest.userConfig).sort()).toEqual([
        'gateway_url',
        'wd_agent_tenant_alias',
        'wd_tenant',
      ]);
    });

    it('marks every field as required', () => {
      const notRequired = userConfigEntries
        .filter(([, field]) => field.required !== true)
        .map(([key]) => key);

      expect(notRequired).toEqual([]);
    });

    it('gives no field a default, so no gateway is hard-coded', () => {
      const withDefaults = userConfigEntries
        .filter(([, field]) => 'default' in field)
        .map(([key]) => key);

      expect(withDefaults).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: FAIL. The suite errors during collection with `ENOENT: no such file or directory` for
`plugins/everywhere/.claude-plugin/plugin.json`. That is the correct failure — the manifest does not
exist yet.

- [ ] **Step 3: Write the minimal manifest**

Create `plugins/everywhere/.claude-plugin/plugin.json`:

```json
{
  "name": "everywhere",
  "displayName": "Workday Everywhere",
  "version": "0.1.0",
  "description": "Connect Claude to the Workday Agent Gateway over HTTP MCP. Tools are discovered from your gateway at runtime; this plugin ships no skills.",
  "author": { "name": "Workday" },
  "homepage": "https://github.com/Workday/everywhere",
  "repository": "https://github.com/Workday/everywhere",
  "license": "Apache-2.0",
  "keywords": ["workday", "mcp", "agent-gateway", "connector"],
  "userConfig": {
    "gateway_url": {
      "type": "string",
      "title": "Agent Gateway MCP URL",
      "description": "Full MCP endpoint for your tenant, e.g. https://<region>.agent.workday.com/<your-tenant>/mcp",
      "required": true
    },
    "wd_tenant": {
      "type": "string",
      "title": "Workday tenant",
      "description": "Sent as the WD-Tenant header, e.g. your-tenant-here.",
      "required": true
    },
    "wd_agent_tenant_alias": {
      "type": "string",
      "title": "Workday agent tenant alias",
      "description": "Sent as the WD-Agent-Tenant-Alias header, e.g. your-alias-here.",
      "required": true
    }
  }
}
```

The angle brackets and `your-tenant-here` are intentional placeholder style, per the repository's
security rules. Do not replace them with a real tenant.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write tests/claude-plugin/manifest.test.ts plugins/everywhere/.claude-plugin/plugin.json
git add tests/claude-plugin/manifest.test.ts plugins/everywhere/.claude-plugin/plugin.json
git commit -m "feat(plugin): add Claude plugin manifest for the gateway connector"
```

---

### Task 2: MCP connector

**Files:**

- Modify: `tests/claude-plugin/manifest.test.ts` (append a new top-level `describe`)
- Create: `plugins/everywhere/.mcp.json`

- [ ] **Step 1: Write the failing test**

In `tests/claude-plugin/manifest.test.ts`, add this interface immediately after the `PluginManifest`
interface:

```typescript
interface McpServer {
  type?: string;
  url?: string;
  command?: string;
  oauth?: unknown;
  headers?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServer>;
}
```

Add these two constants immediately after the `userConfigEntries` constant:

```typescript
const mcpText = readText('plugins/everywhere/.mcp.json');
const mcpConfig = JSON.parse(mcpText) as McpConfig;
```

Then append this `describe` block to the end of the file:

```typescript
describe('the MCP connector', () => {
  const serverNames = Object.keys(mcpConfig.mcpServers);
  const server = mcpConfig.mcpServers['workday'] ?? {};

  it('declares exactly one server', () => {
    expect(serverNames).toHaveLength(1);
  });

  it('names the server "workday"', () => {
    expect(serverNames).toEqual(['workday']);
  });

  it('connects over HTTP', () => {
    expect(server.type).toBe('http');
  });

  it('runs no local command', () => {
    expect(server.command).toBeUndefined();
  });

  it('takes its URL from user configuration', () => {
    expect(server.url).toBe('${user_config.gateway_url}');
  });

  describe('headers', () => {
    it('sends the tenant from user configuration', () => {
      expect(server.headers?.['WD-Tenant']).toBe('${user_config.wd_tenant}');
    });

    it('sends the tenant alias from user configuration', () => {
      expect(server.headers?.['WD-Agent-Tenant-Alias']).toBe(
        '${user_config.wd_agent_tenant_alias}'
      );
    });

    it('identifies the interaction channel to the gateway', () => {
      expect(server.headers?.['wd-agent-interaction-channel']).toBe('claude-cowork-mcp');
    });
  });

  describe('public repository safety', () => {
    it('commits no OAuth client material', () => {
      expect(server.oauth).toBeUndefined();
    });

    it('hard-codes no gateway URL', () => {
      expect(mcpText).not.toContain('https://');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: FAIL. Collection errors with `ENOENT` for `plugins/everywhere/.mcp.json`.

- [ ] **Step 3: Write the minimal connector**

Create `plugins/everywhere/.mcp.json`:

```json
{
  "mcpServers": {
    "workday": {
      "type": "http",
      "url": "${user_config.gateway_url}",
      "headers": {
        "WD-Tenant": "${user_config.wd_tenant}",
        "WD-Agent-Tenant-Alias": "${user_config.wd_agent_tenant_alias}",
        "wd-agent-interaction-channel": "claude-cowork-mcp"
      }
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: PASS, 16 tests.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write tests/claude-plugin/manifest.test.ts plugins/everywhere/.mcp.json
git add tests/claude-plugin/manifest.test.ts plugins/everywhere/.mcp.json
git commit -m "feat(plugin): add HTTP MCP connector for the Agent Gateway"
```

---

### Task 3: Marketplace manifest

**Files:**

- Modify: `tests/claude-plugin/manifest.test.ts` (append a new top-level `describe`)
- Create: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Write the failing test**

In `tests/claude-plugin/manifest.test.ts`, add `existsSync` to the `node:fs` import so the line
reads:

```typescript
import { existsSync, readFileSync } from 'node:fs';
```

Add this interface immediately after the `McpConfig` interface:

```typescript
interface MarketplaceEntry {
  name: string;
  source: string;
  license?: string;
}

interface MarketplaceManifest {
  name: string;
  plugins: MarketplaceEntry[];
}
```

Add this constant immediately after the `mcpConfig` constant:

```typescript
const marketplace = JSON.parse(readText('.claude-plugin/marketplace.json')) as MarketplaceManifest;
```

Then append this `describe` block to the end of the file:

```typescript
describe('the marketplace manifest', () => {
  const entry = marketplace.plugins[0];

  it('names the marketplace "workday"', () => {
    expect(marketplace.name).toBe('workday');
  });

  it('advertises exactly one plugin', () => {
    expect(marketplace.plugins).toHaveLength(1);
  });

  it('advertises the everywhere plugin', () => {
    expect(entry?.name).toBe('everywhere');
  });

  it('points at a plugin directory that exists', () => {
    expect(existsSync(resolve(repoRoot, entry?.source ?? ''))).toBe(true);
  });

  it('declares the same license as the plugin it advertises', () => {
    expect(entry?.license).toBe(pluginManifest.license);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: FAIL. Collection errors with `ENOENT` for `.claude-plugin/marketplace.json`.

- [ ] **Step 3: Write the minimal marketplace manifest**

Create `.claude-plugin/marketplace.json`:

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "workday",
  "owner": {
    "name": "Workday",
    "url": "https://github.com/Workday/everywhere"
  },
  "description": "Claude Code plugins for Workday integrations.",
  "plugins": [
    {
      "name": "everywhere",
      "source": "./plugins/everywhere",
      "displayName": "Workday Everywhere",
      "description": "Connect Claude to the Workday Agent Gateway over HTTP MCP.",
      "category": "productivity",
      "keywords": ["workday", "mcp", "agent-gateway"],
      "license": "Apache-2.0"
    }
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/claude-plugin/manifest.test.ts`

Expected: PASS, 21 tests.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write tests/claude-plugin/manifest.test.ts .claude-plugin/marketplace.json
git add tests/claude-plugin/manifest.test.ts .claude-plugin/marketplace.json
git commit -m "feat(plugin): advertise the everywhere plugin from a marketplace manifest"
```

---

### Task 4: Plugin README

**Files:**

- Create: `plugins/everywhere/README.md`

No test — this is documentation. The acceptance steps it describes are the manual verification the
automated suite cannot perform.

- [ ] **Step 1: Write the README**

Create `plugins/everywhere/README.md`:

````markdown
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
````

- [ ] **Step 2: Format and verify**

```bash
npx prettier --write plugins/everywhere/README.md
npx prettier --check plugins/everywhere/README.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 3: Commit**

```bash
git add plugins/everywhere/README.md
git commit -m "docs(plugin): document install, configuration, and sign-in"
```

---

### Task 5: Cowork packaging recipe

**Files:**

- Modify: `.justfile`

- [ ] **Step 1: Add the recipe**

Append to `.justfile`, after the `clobber` recipe:

```
# Package the Claude plugin into a zip for Cowork's "Upload Plugin" flow
bundle-plugin:
    mkdir -p dist
    version=$(jq -r .version plugins/everywhere/.claude-plugin/plugin.json) && \
        out="$(pwd)/dist/everywhere-plugin-${version}.zip" && \
        rm -f "$out" && \
        cd plugins/everywhere && \
        zip -rX "$out" . -x '.DS_Store'
```

- [ ] **Step 2: Run the recipe to verify it works**

Run: `just bundle-plugin && unzip -l dist/everywhere-plugin-0.1.0.zip`

Expected: the archive lists `.claude-plugin/plugin.json`, `.mcp.json`, and `README.md`. `dist/` is
already gitignored, so the zip will not be committed.

- [ ] **Step 3: Commit**

```bash
git add .justfile
git commit -m "chore(plugin): add bundle-plugin recipe for Cowork upload"
```

---

### Task 6: Full verification

**Files:** none — this task only runs checks.

- [ ] **Step 1: Confirm nothing outside the plugin changed**

Run: `git diff --stat origin/main...HEAD`

Expected: only `.claude-plugin/marketplace.json`, `.justfile`, `docs/superpowers/**`,
`plugins/everywhere/**`, and `tests/claude-plugin/manifest.test.ts`. If `src/`, `cli/`,
`package.json`, or `package-lock.json` appear, something went wrong — stop and report it.

- [ ] **Step 2: Confirm the npm package is unaffected**

Run:

```bash
npm pack --dry-run 2>&1 | grep -E 'plugins/|\.claude-plugin/' \
  || echo "OK: no plugin files in the npm tarball"
```

Expected: `OK: no plugin files in the npm tarball`. The `files` allowlist in `package.json` excludes
the new directories. (The `|| echo` matters — `grep` exits non-zero when it finds nothing, which is
the outcome we want here.)

- [ ] **Step 3: Run the full check**

Run: `just check`

Expected: passes. Prettier finds no unformatted files; `tsc` and `eslint` are unaffected by the new
files.

- [ ] **Step 4: Run the full test suite**

Run: `just test`

Expected: passes, including the 21 new assertions in `tests/claude-plugin/manifest.test.ts`.

- [ ] **Step 5: Report results**

Report the actual output of Steps 1–4. Do not claim success for any step that was not run.

---

## Manual acceptance (requires a live gateway)

The automated suite proves manifest shape, not connectivity. These steps cannot run in CI and are
for the person evaluating the POC:

1. `/plugin marketplace add <path-to-this-worktree>` then `/plugin install everywhere@workday`
2. Supply the three configuration values for a tenant you can reach
3. `/mcp` → `workday` → complete browser sign-in
4. Confirm gateway tools appear in `/mcp`, and that a Workday question calls one

Step 3 is the open question the POC exists to answer: whether the gateway supports dynamic client
registration. If it fails with "does not support dynamic client registration," the plugin still
works via the manual `claude mcp add` fallback in the plugin README — record the outcome either way.
