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

const PLUGINS = ['custom-agents', 'sana'];

describe.each(PLUGINS)('the %s plugin', (slug) => {
  const manifest = readJson<Record<string, unknown>>(`plugins/${slug}/.claude-plugin/plugin.json`);
  const servers = readJson<McpConfig>(`plugins/${slug}/.mcp.json`).mcpServers;
  const server = servers['workday'] ?? {};

  it('declares no user configuration, since the gateway is a single shared endpoint', () => {
    expect('userConfig' in manifest).toBe(false);
  });

  it('declares exactly one MCP server, named "workday"', () => {
    expect(Object.keys(servers)).toEqual(['workday']);
  });

  it('connects over HTTP with an empty URL, which the directory listing supplies', () => {
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

describe('the retired everywhere plugin', () => {
  const marketplace = readJson<{ renames?: Record<string, string | null> }>(
    '.claude-plugin/marketplace.json'
  );

  it('moves existing installs to custom-agents', () => {
    expect(marketplace.renames?.['everywhere']).toBe('custom-agents');
  });
});

describe('the shared connector', () => {
  it('is identical across every plugin', () => {
    expect(readText('plugins/custom-agents/.mcp.json')).toBe(readText('plugins/sana/.mcp.json'));
  });
});
