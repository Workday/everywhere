import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const readText = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

interface PluginManifest {
  name: string;
  version: string;
  license: string;
  skills?: unknown;
  userConfig?: Record<string, unknown>;
}

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

interface MarketplaceEntry {
  name: string;
  source: string;
  license?: string;
}

interface MarketplaceManifest {
  name: string;
  plugins: MarketplaceEntry[];
}

const pluginManifest = JSON.parse(
  readText('plugins/everywhere/.claude-plugin/plugin.json')
) as PluginManifest;

const mcpText = readText('plugins/everywhere/.mcp.json');
const mcpConfig = JSON.parse(mcpText) as McpConfig;

const marketplace = JSON.parse(readText('.claude-plugin/marketplace.json')) as MarketplaceManifest;

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

  it('declares no user configuration, since the gateway is a single shared endpoint', () => {
    expect(pluginManifest.userConfig).toBeUndefined();
  });
});

describe('the MCP connector', () => {
  const serverNames = Object.keys(mcpConfig.mcpServers);
  const server = mcpConfig.mcpServers['workday'];

  if (!server) {
    throw new Error('.mcp.json declares no "workday" server');
  }

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

  it('connects to the shared Agent Gateway endpoint', () => {
    expect(server.url).toBe('https://sana.we.myworkday.com/mcp');
  });

  it('sends no custom headers', () => {
    expect(server.headers).toBeUndefined();
  });

  it('commits no OAuth client material', () => {
    expect(server.oauth).toBeUndefined();
  });
});

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
    expect(entry?.source && existsSync(resolve(repoRoot, entry.source))).toBe(true);
  });

  it('declares the same license as the plugin it advertises', () => {
    expect(entry?.license).toBe(pluginManifest.license);
  });
});
