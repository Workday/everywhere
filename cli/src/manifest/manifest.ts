import * as fs from 'node:fs';
import * as path from 'node:path';

// Intentionally duplicated from src/types.ts — keep in sync.
// Cross-package TypeScript source imports are not supported by this CLI's tsconfig.
// SDK consumers should import PluginCapabilities from '@workday/everywhere'.
export interface PluginCapabilities {
  network?: { allowedDomains: string[] };
  storage?: boolean;
  console?: boolean;
}

export interface PluginManifest {
  name: string;
  version: string;
  title?: string;
  capabilities: PluginCapabilities;
}

// Matches a.b, a.b.c etc — no wildcards, no bare hostnames, no IPs
const FQDN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const KNOWN_CAPABILITY_KEYS = new Set(['network', 'storage', 'console']);

function validateCapabilities(raw: unknown): PluginCapabilities {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('capabilities must be a plain object');
  }

  const caps = raw as Record<string, unknown>;

  for (const key of Object.keys(caps)) {
    if (!KNOWN_CAPABILITY_KEYS.has(key)) {
      throw new Error(`unknown capability key: ${key}`);
    }
  }

  if (caps['network'] !== undefined) {
    const network = caps['network'];
    if (network === null || typeof network !== 'object' || Array.isArray(network)) {
      throw new Error('capabilities.network must be an object');
    }
    const net = network as Record<string, unknown>;
    if (!Array.isArray(net['allowedDomains'])) {
      throw new Error('capabilities.network.allowedDomains must be an array');
    }
    for (const domain of net['allowedDomains'] as unknown[]) {
      if (typeof domain !== 'string' || !FQDN.test(domain)) {
        throw new Error(
          `'${domain}' is not a valid fully-qualified domain name (no wildcards, IPs, or bare hostnames)`
        );
      }
    }
  }

  if (caps['storage'] !== undefined && typeof caps['storage'] !== 'boolean') {
    throw new Error('capabilities.storage must be a boolean');
  }

  if (caps['console'] !== undefined && typeof caps['console'] !== 'boolean') {
    throw new Error('capabilities.console must be a boolean');
  }

  return caps as unknown as PluginCapabilities;
}

export function readPluginManifest(pluginDir: string): PluginManifest {
  const pkgPath = path.join(pluginDir, 'package.json');

  let pkg: { name?: unknown; version?: unknown; title?: unknown; capabilities?: unknown };

  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('No package.json found in the plugin directory.', { cause: e });
    }
    const message = e instanceof Error ? e.message : 'JSON parsing error - details not available';
    throw new Error(`package.json is not valid JSON\n${message}`, { cause: e });
  }

  if (!pkg.name || typeof pkg.name !== 'string') {
    throw new Error('package.json is missing required field: name');
  }

  if (!pkg.version || typeof pkg.version !== 'string') {
    throw new Error('package.json is missing required field: version');
  }

  const title = typeof pkg.title === 'string' && pkg.title.length > 0 ? pkg.title : undefined;

  if (!('capabilities' in pkg)) {
    throw new Error('package.json is missing required field: capabilities');
  }

  const capabilities = validateCapabilities(pkg.capabilities);

  return { name: pkg.name as string, version: pkg.version as string, title, capabilities };
}
