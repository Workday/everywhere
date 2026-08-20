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
