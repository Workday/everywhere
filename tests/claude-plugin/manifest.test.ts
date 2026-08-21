import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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

const userConfigEntries = Object.entries(pluginManifest.userConfig ?? {});

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

  describe('user configuration', () => {
    it('declares exactly the fields the connector needs, and no others', () => {
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

describe('the MCP connector', () => {
  const serverNames = Object.keys(mcpConfig.mcpServers);
  const server = mcpConfig.mcpServers['workday'];

  if (!server) {
    throw new Error('.mcp.json declares no "workday" server');
  }

  const connectorValues = [server.url ?? '', ...Object.values(server.headers ?? {})];

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

    it('hard-codes nothing but the fixed interaction channel', () => {
      const hardCoded = connectorValues.filter((value) => !/^\$\{user_config\.\w+\}$/.test(value));

      expect(hardCoded).toEqual(['claude-cowork-mcp']);
    });

    it('names no host anywhere in the file', () => {
      expect(mcpText).not.toMatch(/\/\/[\w.-]+\./);
    });
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
