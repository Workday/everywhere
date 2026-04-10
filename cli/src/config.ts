import * as fs from 'node:fs';
import * as path from 'node:path';

const CONFIG_DIR = 'everywhere';
const CONFIG_FILE = '.config.json';

export interface PluginConfig {
  extend?: string;
  install?: string;
}

export function configPath(pluginDir: string): string {
  return path.join(pluginDir, CONFIG_DIR, CONFIG_FILE);
}

export function readConfig(pluginDir: string): PluginConfig {
  const filePath = configPath(pluginDir);

  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function writeConfig(pluginDir: string, updates: Partial<PluginConfig>): void {
  const filePath = configPath(pluginDir);
  const dir = path.dirname(filePath);

  fs.mkdirSync(dir, { recursive: true });

  const existing = readConfig(pluginDir);
  const merged = { ...existing, ...updates };

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
}
