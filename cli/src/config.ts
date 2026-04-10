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
