import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Schema validity is checked by plugin submission. These tests guard the policy invariants a
// schema check cannot see: the empty connector URL, and nothing committed that changes how
// existing installs authenticate or prompt.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const readText = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

const readJson = <T>(relativePath: string): T => JSON.parse(readText(relativePath)) as T;

interface McpConfig {
  mcpServers: Record<string, Record<string, unknown>>;
}

describe('the Sana from Workday plugin', () => {
  const manifest = readJson<Record<string, unknown>>('plugins/sana/.claude-plugin/plugin.json');
  const servers = readJson<McpConfig>('plugins/sana/.mcp.json').mcpServers;
  const server = servers['workday'] ?? {};

  it('declares no user configuration, since the directory listing collects the gateway URL', () => {
    expect('userConfig' in manifest).toBe(false);
  });

  it('declares exactly one MCP server, named "workday"', () => {
    expect(Object.keys(servers)).toEqual(['workday']);
  });

  it('connects over HTTP with an empty URL, which an Owner fills in through the directory listing', () => {
    expect(server).toMatchObject({ type: 'http', url: '' });
  });

  it('runs no local command', () => {
    expect('command' in server).toBe(false);
  });

  it('sends no custom headers', () => {
    expect('headers' in server).toBe(false);
  });

  it('commits no OAuth client material', () => {
    expect('oauth' in server).toBe(false);
  });
});

describe('the Workday marketplace', () => {
  const marketplace = readJson<{
    renames?: Record<string, string | null>;
    plugins: { name: string; source: string; displayName: string }[];
  }>('.claude-plugin/marketplace.json');

  it('lists only Sana from Workday', () => {
    expect(
      marketplace.plugins.map(({ name, source, displayName }) => ({ name, source, displayName }))
    ).toEqual([{ name: 'sana', source: './plugins/sana', displayName: 'Sana from Workday' }]);
  });

  it('moves existing everywhere installs to sana', () => {
    expect(marketplace.renames?.['everywhere']).toBe('sana');
  });
});
