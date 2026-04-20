import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PluginManifest {
  name: string;
  version: string;
}

export function readPluginManifest(pluginDir: string): PluginManifest {
  const pkgPath = path.join(pluginDir, 'package.json');

  let pkg: { name?: unknown; version?: unknown };

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

  return { name: pkg.name as string, version: pkg.version as string };
}
